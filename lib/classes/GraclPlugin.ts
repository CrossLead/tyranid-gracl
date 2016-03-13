/// <reference path='../../typings/main.d.ts' />

import Tyr from 'tyranid';
import { PermissionsModel } from '../collections/PermissionsModel';
import { Subject, Resource, Graph, Repository, SchemaNode } from 'gracl';


export type BootStage = 'compile' | 'link' | 'post-link';
export type Hash<T> = { [key: string]: T; };
export type TyrSchemaGraphObjects = {
  links: Tyr.Field[];
  parents: Tyr.CollectionInstance[];
};




export class GraclPlugin {


  // create a repository object for a given collection
  static makeRepository(collection: Tyr.CollectionInstance) {
    return {
      async getEntity(id: string): Promise<Tyr.Document> {
        return await collection.byId(id);
      },
      async saveEntity(id: string, doc: Tyr.Document): Promise<Tyr.Document> {
        return await doc.$save();
      }
    };
  }


  graph: Graph;


  boot(stage: BootStage) {
    if (stage === 'post-link') {
      const collections = Tyr.collections,
            nodeSet = new Set<string>();

      const schemaObjects = {
        subjects: <TyrSchemaGraphObjects> {
          links: [],
          parents: []
        },
        resources: <TyrSchemaGraphObjects> {
          links: [],
          parents: []
        }
      };


      // loop through all collections, retrieve
      // ownedBy links
      collections.forEach(col => {
        const linkFields = col.links({ relate: 'ownedBy', direction: 'outgoing' }),
              collectionName = col.def.name;

        if (!linkFields.length) return;

        // validate that we can only have one parent of each field.
        if (linkFields.length > 1) {
          throw new Error(
            `tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` +
            `Collection ${collectionName} has multiple fields with outgoing ownedBy relations.`
          );
        }

        const [ field ] = linkFields,
              { graclType } = field.def;

        if (!graclType) return;

        // validate gracl type
        switch (graclType) {
          case 'subject':
            schemaObjects.subjects.links.push(field);
            schemaObjects.subjects.parents.push(field.link);
            break;
          case 'resource':
            schemaObjects.resources.links.push(field);
            schemaObjects.resources.parents.push(field.link);
            break;
          default:
            throw new Error(`Invalid gracl node type set on collection ${collectionName}, type = ${graclType}`);
        }
      });

      const schemaMaps = {
        subjects: new Map<string, SchemaNode>(),
        resources: new Map<string, SchemaNode>()
      };

      for (const type of ['subjects', 'resources']) {
        let nodes: Map<string, SchemaNode>,
            tyrObjects: TyrSchemaGraphObjects;

        if (type === 'subjects') {
          nodes = schemaMaps.subjects;
          tyrObjects = schemaObjects.subjects;
        } else {
          nodes = schemaMaps.resources;
          tyrObjects = schemaObjects.resources;
        }

        for (const node of tyrObjects.links) {
          const name = node.collection.def.name,
                parentName = node.link.def.name;

          nodes.set(name,
            { name,
              parent: parentName,
              parentId: node.name,
              repository: GraclPlugin.makeRepository(node.collection)
            }
          );
        }

        for (const parent of tyrObjects.parents) {
          const name = parent.def.name;
          if (!nodes.has(name)) {
            nodes.set(name, {
              name,
              repository: GraclPlugin.makeRepository(parent)
            });
          }
        }

      }

      this.graph = new Graph({
        subjects: Array.from(schemaMaps.subjects.values()),
        resources: Array.from(schemaMaps.resources.values())
      });

    }
  }


  /**
   *  Method for creating a specific query based on a schema object
   */
  async query(collection: Tyr.CollectionInstance, permission: string, user = Tyr.local.user): Promise<boolean | {}> {
    if (!this.graph) {
      throw new Error(`Must call this.boot() before using query method!`);
    }

    const queryObj = {};

    // if no user, no restriction...
    if (!user) return false;

    // extract subject and resource Gracl classes
    const ResourceClass = this.graph.getResource(collection.def.name),
          SubjectClass = this.graph.getSubject(user.$model.def.name);

    const subject = new SubjectClass(user);

    // get list of all ids in the subject and resource hierarchies,
    // as well as the names of the subject and resource classes
    const subjectHierarchyIds = await subject.getHierarchyIds(),
          subjectType = subject.getName(),
          resourceType = ResourceClass.displayName;

    const permissions = await PermissionsModel.find({
      subjectId: { $in: subjectHierarchyIds },
      resourceType
    });

    // with array of permissions, determine what types each uid is, and then
    // create restrictions if that type is present on <collection>
    // NOTE: -- do we need organizationId on everything then? or should this automatically
    // recurse down the chain to determine what groups are within an organization and do a diff?

    /**
      access AT component

      - collection == AlignmentTriangleComponent collection

      1. Find all the permissions with this user as the subject and the resource being
          one type within the AlignmentTriangleComponent resource hierarchy (component, team, org...)

      2. Loop through permissions and build query object
        if found org for example
          determine property on AT component schema that relates to org

          query {
            teamId:
          }
    */

    return queryObj;
  }


}
