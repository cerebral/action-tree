export type Chain = Array<ChainItem>
export type ChainItem = ActionFunc | ActionOutputs | ParallelActions
export type ParallelActions = Array<ActionFunc | ActionOutputs>
export type Path = Array<string | number>

export interface ActionFunc {
  (context: any): void
  async?: boolean
  displayName?: string
}

export interface ActionOutputs {
  [key: string]: Chain
}

export interface ActionDescription {
  name: string
  isAsync: boolean
  path: Path
  actionIndex: number
  outputs?: {
    [key: string]: any
  }
}

export type ChainDescription = Array<ActionDescription | ActionDescription[]> 

function getFunctionName (fn: any) {
  var ret = fn.toString()
  ret = ret.substr('function '.length)
  ret = ret.substr(0, ret.indexOf('('))
  return ret
}

function traverse (path: Path, actions: ActionFunc[], item: Chain | ParallelActions, isChain: boolean): ChainDescription
function traverse (path: Path, actions: ActionFunc[], item: ActionFunc, outputs: ActionOutputs, isSync: boolean): ActionDescription
function traverse (path: Path, actions: ActionFunc[], item: any, isChain?: any, isSync?: boolean): any {
  if (Array.isArray(item) && typeof isChain === 'boolean') {
    return (item as Chain).map(function (subItem: ChainItem, index: number) {
      path.push(index)
      if (typeof subItem === 'function') {
        let nextSubItem = item[index + 1]
        if (!Array.isArray(nextSubItem) && typeof nextSubItem === 'object') {
          item.splice(index + 1, 1)
          return traverse(path, actions, subItem as ActionFunc, nextSubItem, isChain)
        } else {
          return traverse(path, actions, subItem as ActionFunc, null, isChain)
        }
      } else if (Array.isArray(item) && isChain) {
        return traverse(path, actions, subItem as ParallelActions, false)
      } else {
        throw new Error('Unexpected entry in signal chain')
      }
    }).filter(function (action) {
      // Removed ActionOutputs leaves null in the end of array
      return !!action
    })
  } else if (typeof item === 'function') {
    let actionFunc: ActionFunc = item as ActionFunc
    let outputs: ActionOutputs = isChain as ActionOutputs
    let action: ActionDescription = {
      name: actionFunc.displayName || getFunctionName(actionFunc),
      isAsync: !!actionFunc.async || !isSync,
      path: path.slice(),
      actionIndex: actions.indexOf(actionFunc) === -1 ? actions.push(actionFunc) : actions.indexOf(actionFunc)
    }
    
    if (outputs) {
      action.outputs = {}
      Object.keys(outputs).forEach(function (key) {
        path.push('outputs', key)
        action.outputs[key] = traverse(path, actions, outputs[key], true)
        path.pop()
        path.pop()
      })
    }

    path.pop()
    return action
  } else {
    throw new Error('Unexpected entry in signal chain')
  }
}

export default traverse
