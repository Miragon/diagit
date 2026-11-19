import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json' with { type: 'json' }

const CAMUNDA_7_NAMESPACE = 'http://camunda.org/schema/1.0/bpmn'
const OPERATON_NAMESPACE = 'http://operaton.org/schema/1.0/bpmn'

export function camundaModdleFor(xml: string) {
  const declaresOnlyOperaton =
    xml.includes(OPERATON_NAMESPACE) && !xml.includes(CAMUNDA_7_NAMESPACE)
  return declaresOnlyOperaton ? { ...camundaModdle, uri: OPERATON_NAMESPACE } : camundaModdle
}
