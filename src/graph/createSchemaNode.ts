import { Tyr } from 'tyranid';
import * as _ from 'lodash';
import { ObjectID } from 'mongodb';
import { SchemaNode, Permission, Node, Subject } from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
import { PermissionsModel } from '../models/PermissionsModel';
import { makeRepository } from '../tyranid/makeRepository';
import { getShortestPath } from './getShortestPath';
import { findLinkInCollection } from './findLinkInCollection';

/**
 *  Create a schema node for consumption by gracl.buildResourceHierarchy() or gracl.buildSubjectHierarchy()

  Example:

  ```js
  const resources = new Map<string, SchemaNode>();

  // given (node: Tyr.Field) and (name: string) ....
  resources.set(name, plugin.createSchemaNode(node.collection, graclType, node));

  const resourceHiearchy = Graph.buildResourceHierarchy(Array.from(resources.values()));
  ```
 */
export function createSchemaNode(
  plugin: GraclPlugin,
  collection: Tyr.GenericCollection,
  type: string,
  node?: Tyr.FieldInstance
): SchemaNode {
  return <SchemaNode> {

    id: '$uid',
    name: collection.def.name,
    repository: makeRepository(plugin, collection, type),
    type: type,
    parent: node && node.link.def.name,

    async getPermission(this: Node, subject: Subject): Promise<Permission> {
      const subjectId = subject.getId(),
            resourceId = this.getId();

      const perm = <any> (await PermissionsModel.findOne({ query:
        {
          subjectId,
          resourceId
        }
      }));

      return <Permission> (perm || {
        subjectId,
        resourceId: '',
        resourceType: '',
        subjectType: this.getName(),
        access: {}
      });
    },

    async getParents(this: Node): Promise<Node[]> {
      if (node) {
        const ParentClass = this.getParentClass();
        const parentNamePath = node.collection.parsePath(node.path);

        let ids: any = parentNamePath.get(this.doc);

        if (ids && !(ids instanceof Array)) {
          ids = [ ids ];
        }

        // if no immediate parents, recurse
        // up resource chain and check for
        // alternate path to current node
        if (!(ids && ids.length)) {
          const hierarchyClasses = ParentClass.getHierarchyClassNames(),
                thisCollection = Tyr.byName[this.getName()],
                doc = <Tyr.Document> this.doc;

          hierarchyClasses.shift(); // remove parent we already tried

          // try to find a path between one of the hierarchy classes
          // (starting from lowest and recursing upward)
          while (hierarchyClasses.length) {
            const currentParent = hierarchyClasses.shift() || plugin._NO_COLLECTION;

            const currentParentCollection = Tyr.byName[currentParent],
                  path = getShortestPath(plugin, thisCollection, currentParentCollection),
                  CurrentParentNodeClass = type === 'resource'
                    ? plugin.graclHierarchy.getResource(currentParent)
                    : plugin.graclHierarchy.getSubject(currentParent);

            if (path.length && path.length >= 2) {
              let currentCollection = Tyr.byName[path.shift() || plugin._NO_COLLECTION],
                  nextCollection = Tyr.byName[path.shift() || plugin._NO_COLLECTION],
                  linkField = findLinkInCollection(plugin, currentCollection, nextCollection);

              const idProp = linkField.namePath.get(doc) || [];

              let ids: ObjectID[] = !idProp
                ? []
                : (Array.isArray(idProp) ? idProp : [ idProp ]);

              // this potential path has found a dead end,
              // we need to try another upper level resource
              if (!ids.length) continue;

              while (linkField.link.def.name !== currentParent) {
                currentCollection = nextCollection;
                nextCollection = Tyr.byName[path.shift() || plugin._NO_COLLECTION];
                linkField = findLinkInCollection(plugin, currentCollection, nextCollection);
                const nextDocuments = await currentCollection.byIds(ids);
                ids = <ObjectID[]> _.chain(nextDocuments)
                  .map((d: Tyr.Document) => linkField.namePath.get(d))
                  .flatten()
                  .compact()
                  .value();
              }

              if (!ids.length) continue;

              const parentDocs = await nextCollection.byIds(ids),
                    parents = _.map(parentDocs, (d: Tyr.Document) => new CurrentParentNodeClass(d));

              return parents;
            }
          }

          return [];
        }


        const linkCollection = node.link,
              parentObjects  = await linkCollection.byIds(ids);

        return _.map(parentObjects, doc => new ParentClass(doc));
      } else {
        return [];
      }
    }

  };
}
