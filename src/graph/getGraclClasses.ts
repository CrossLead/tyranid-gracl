import Tyr from 'tyranid';
import { Subject, Resource } from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
import { createSubject } from './createSubject';
import { createResource } from './createResource';

export function getGraclClasses(
  plugin: GraclPlugin,
  resourceDocument: Tyr.Document,
  subjectDocument: Tyr.Document
): { subject: Subject, resource: Resource } {
  const resourceCollectionName = resourceDocument.$model.def.name;

  const subject  = createSubject(plugin, subjectDocument),
        resource = createResource(plugin, resourceDocument);

  return { subject, resource };
}
