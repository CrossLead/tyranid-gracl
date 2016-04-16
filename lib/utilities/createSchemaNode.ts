import Tyr from 'tyranid';
import { SchemaNode, Repository, Node, Subject, Permission } from 'gracl';
import { makeRepository, findLinkInCollection } from './';
import { PermissionsModel } from '../models/PermissionsModel';


export function createSchemaNode(collection: Tyr.CollectionInstance, type: string, node?: Tyr.Field): SchemaNode {
  return <SchemaNode> {

    id: '$uid',
    name: collection.def.name,
    repository: makeRepository(collection, type),
    type: type,
    parent: node && node.link.def.name,

    async getPermission(subject: Subject): Promise<Permission> {
      const thisNode = <Node> this;
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
        subjectType: this.getName(),
        access: {}
      });
    },

    async getParents(): Promise<Node[]> {
      if (!node) return [];

      const thisNode = this;
      const ParentClass = thisNode.getParentClass();
      const plugin = PermissionsModel.getGraclPlugin();

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
        let currentParent: string;
        while (currentParent = hierarchyClasses.shift()) {
          const currentParentCollection = Tyr.byName[currentParent],
                path = plugin.getShortestPath(thisCollection, currentParentCollection),
                CurrentParentNodeClass = type === 'resource'
                  ? plugin.graclHierarchy.getResource(currentParent)
                  : plugin.graclHierarchy.getSubject(currentParent);

          if (path.length && path.length >= 2) {
            let currentCollection = Tyr.byName[path.shift()],
                nextCollection = Tyr.byName[path.shift()],
                linkField = findLinkInCollection(currentCollection, nextCollection);

            const idProp = linkField.namePath.get(doc) || [];

            let ids: string[] = !idProp
              ? []
              : (Array.isArray(idProp) ? idProp : [ idProp ]);

            // this potential path has found a dead end,
            // we need to try another upper level resource
            if (!ids.length) continue;

            while (linkField.link.def.name !== currentParent) {
              currentCollection = nextCollection;
              nextCollection = Tyr.byName[path.shift()];
              linkField = findLinkInCollection(currentCollection, nextCollection);
              const nextDocuments = await currentCollection.byIds(ids);
              ids = <string[]> _.chain(nextDocuments)
                .map(d => linkField.namePath.get(d))
                .flatten()
                .compact()
                .value();
            }

            if (!ids.length) continue;

            const parentDocs = await nextCollection.byIds(ids),
                  populated = await Promise.all(parentDocs.map(PermissionsModel.populatePermissions)),
                  parents = populated.map(d => new CurrentParentNodeClass(d));

            return parents;
          }
        }

        return [];
      }

      const linkCollection = node.link,
            parentObjects  = await linkCollection.findAll({
                                [linkCollection.def.primaryKey.field]: { $in: ids }
                             });

      const populated = await Promise.all(parentObjects.map(PermissionsModel.populatePermissions));

      return populated.map(doc => new ParentClass(doc));
    }

  };
}
