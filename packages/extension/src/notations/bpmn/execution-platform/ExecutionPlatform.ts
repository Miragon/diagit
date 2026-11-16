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
    const operatonPrefix = ExecutionPlatform.prefixOf(attributes, OPERATON_NAMESPACE)
    return new ExecutionPlatform(
      ExecutionPlatform.declaredEngine(attributes) ??
        ExecutionPlatform.engineFromNamespaces(attributes, operatonPrefix),
      operatonPrefix,
    )
  }

  private constructor(
    readonly engine: Engine,
    private readonly operatonPrefix: string | undefined,
  ) {}

  get hasTransactionBoundaries(): boolean {
    return this.engine === 'camunda7' || this.engine === 'operaton'
  }

  extensionAttribute(businessObject: Record<string, any>, name: string): unknown {
    if (this.engine === 'operaton') {
      return businessObject.$attrs?.[`${this.operatonPrefix}:${name}`]
    }
    return businessObject[name]
  }

  private static declaredEngine(attributes: Attributes): Engine | undefined {
    const declaredPlatform = Object.entries(attributes).find(([name]) =>
      name.endsWith(':executionPlatform'),
    )?.[1]
    return declaredPlatform === undefined
      ? undefined
      : ENGINES_BY_DECLARED_PLATFORM[declaredPlatform]
  }

  private static engineFromNamespaces(
    attributes: Attributes,
    operatonPrefix: string | undefined,
  ): Engine {
    if (Object.values(attributes).includes(CAMUNDA_7_NAMESPACE)) {
      return 'camunda7'
    }
    if (operatonPrefix !== undefined) {
      return 'operaton'
    }
    return 'unknown'
  }

  private static prefixOf(attributes: Attributes, namespace: string): string | undefined {
    const declaration = Object.entries(attributes).find(
      ([name, uri]) => name.startsWith('xmlns:') && uri === namespace,
    )
    return declaration?.[0].slice('xmlns:'.length)
  }
}
