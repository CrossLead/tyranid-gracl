import Tyr from 'tyranid';
import { Subject, Resource } from 'gracl';
import { GraclPlugin } from '../';

export function getGraclClasses(
  resourceDocument: Tyr.Document,
  subjectDocument: Tyr.Document
): { subject: Subject, resource: Resource } {
  const plugin = <GraclPlugin> this,
        resourceCollectionName = resourceDocument.$model.def.name;

  const subject  = plugin.createSubject(subjectDocument),
        resource = plugin.createResource(resourceDocument);

  return { subject, resource };
}
