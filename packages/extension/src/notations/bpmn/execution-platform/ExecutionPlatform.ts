const CAMUNDA_7_NAMESPACE = 'http://camunda.org/schema/1.0/bpmn'
const OPERATON_NAMESPACE = 'http://operaton.org/schema/1.0/bpmn'

const ENGINES_BY_DECLARED_PLATFORM: Record<string, Engine> = {
  'Camunda Platform': 'camunda7',
  'Camunda Cloud': 'camunda8',
  Operaton: 'operaton',
}

export type Engine = 'camunda7' | 'camunda8' | 'operaton' | 'unknown'

type Attributes = Record<string, string>

interface Definitions {
  $attrs?: Attributes
}

export class ExecutionPlatform {
  static detect(definitions: Definitions): ExecutionPlatform {
    const attributes = definitions.$attrs ?? {}
    return new ExecutionPlatform(
      ExecutionPlatform.declaredEngine(attributes) ??
        ExecutionPlatform.engineFromNamespaces(attributes),
    )
  }

  private constructor(readonly engine: Engine) {}

  get hasTransactionBoundaries(): boolean {
    return this.engine === 'camunda7' || this.engine === 'operaton'
  }

  private static declaredEngine(attributes: Attributes): Engine | undefined {
    const declaredPlatform = Object.entries(attributes).find(([name]) =>
      name.endsWith(':executionPlatform'),
    )?.[1]
    return declaredPlatform === undefined
      ? undefined
      : ENGINES_BY_DECLARED_PLATFORM[declaredPlatform]
  }

  private static engineFromNamespaces(attributes: Attributes): Engine {
    const namespaces = Object.values(attributes)
    if (namespaces.includes(CAMUNDA_7_NAMESPACE)) {
      return 'camunda7'
    }
    if (namespaces.includes(OPERATON_NAMESPACE)) {
      return 'operaton'
    }
    return 'unknown'
  }
}
