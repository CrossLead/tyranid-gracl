import Tyr from 'tyranid';
import * as _ from 'lodash';
import { SchemaNode, Permission, Node, Subject } from 'gracl';
import { GraclPlugin } from '../';
import { PermissionsModel } from '../../../models/PermissionsModel';
import { Hash } from '../../../interfaces';

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
export function createSchemaNode(collection: Tyr.CollectionInstance, type: string, node?: Tyr.Field): SchemaNode {
  const plugin = <GraclPlugin> this;

  return <SchemaNode> {

    id: '$uid',
    name: collection.def.name,
    repository: plugin.makeRepository(collection, type),
    type: type,
    parent: node && node.link.def.name,

    async getPermission(subject: Subject): Promise<Permission> {
      const thisNode = <Node> (<any> this);
      const subjectId = subject.getId(),
            resourceId = thisNode.getId();

      const perm = <any> (await PermissionsModel.findOne({
        subjectId,
        resourceId
      }));

      return <Permission> (perm || {
        subjectId,
        resourceId: '',
        resourceType: '',
        subjectType: thisNode.getName(),
        access: {}
      });
    },

    async getParents(): Promise<Node[]> {
      if (node) {
        const thisNode = <Node> (<any> this);
        const ParentClass = thisNode.getParentClass();
        const parentNamePath = node.collection.parsePath(node.path);

        let ids: any = parentNamePath.get(thisNode.doc);

        if (ids && !(ids instanceof Array)) {
          ids = [ ids ];
        }

        // if no immediate parents, recurse
        // up resource chain and check for
        // alternate path to current node
        if (!(ids && ids.length)) {
          const hierarchyClasses = ParentClass.getHierarchyClassNames(),
                thisCollection = Tyr.byName[thisNode.getName()],
                doc = <Tyr.Document> thisNode.doc;

          hierarchyClasses.shift(); // remove parent we already tried

          // try to find a path between one of the hierarchy classes
          // (starting from lowest and recursing upward)
          while (hierarchyClasses.length) {
            const currentParent = hierarchyClasses.shift() || plugin._NO_COLLECTION;

            const currentParentCollection = Tyr.byName[currentParent],
                  path = plugin.getShortestPath(thisCollection, currentParentCollection),
                  CurrentParentNodeClass = type === 'resource'
                    ? plugin.graclHierarchy.getResource(currentParent)
                    : plugin.graclHierarchy.getSubject(currentParent);

            if (path.length && path.length >= 2) {
              let currentCollection = Tyr.byName[path.shift() || plugin._NO_COLLECTION],
                  nextCollection = Tyr.byName[path.shift() || plugin._NO_COLLECTION],
                  linkField = plugin.findLinkInCollection(currentCollection, nextCollection);

              const idProp = linkField.namePath.get(doc) || [];

              let ids: string[] = !idProp
                ? []
                : (Array.isArray(idProp) ? idProp : [ idProp ]);

              // this potential path has found a dead end,
              // we need to try another upper level resource
              if (!ids.length) continue;

              while (linkField.link.def.name !== currentParent) {
                currentCollection = nextCollection;
                nextCollection = Tyr.byName[path.shift() || plugin._NO_COLLECTION];
                linkField = plugin.findLinkInCollection(currentCollection, nextCollection);
                const nextDocuments = await currentCollection.byIds(ids);
                ids = <string[]> _.chain(nextDocuments)
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
