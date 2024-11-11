# react18事件系统

## 前置知识

事件流包含三个阶段, 按照以下顺序依次执行

```js
1. 事件捕获阶段
2. 处于目标阶段
3. 事件冒泡阶段
```

原生事件会产生一些跨平台的兼容问题

#### 1. 阻止冒泡

- 在微软的模型中你必须设置事件的 `cancelBubble` 的属性为 true
- 在 W3C 模型中你必须调用事件的 `stopPropagation()` 方法

```js
function stopPropagation(event) {
  if (!event) {
    window.event.cancelBubble = true;
  }
  if (event.stopPropagation) {
    event.stopPropagation();
  }
}
```

#### 2. 阻止默认事件

- 在微软的模型中你必须设置事件的 `returnValue` 的属性为 false
- 在 W3C 模型中你必须调用事件的 `preventDefault()` 方法

```js
function preventDefault(event) {
  if (!event) {
    window.event.returnValue = false
  }
  if (event.preventDefault) {
    event.preventDefault()
  }
}
```

基于以上等一些跨平台的浏览器兼容问题，React 内部实现了一套自己的合成事件。



## 事件代理

事件代理又称之为事件委托， 事件代理是把原本需要绑定在`子元素`的事件委托给`父元素`，让父元素负责事件监听和处理。在`react18`中事件绑定在`root`节点上，也就是我们应用挂载的节点。

**事件代理主要有以下好处：**

1. 可以大量节省内存占用，减少事件注册事件。

2. 当新增子对象时无需再次对其绑定

**能够事件事件代理的前提：**

1. 事件冒泡到父元素，父元素可以订阅到冒泡事件。

2. 可以通过 `event.target` 得到目标节点。不然, 父元素怎么针对不同的子节点，进行定制化事件代理。

`react`实现事件代理也是基于此，对于不支持的冒泡的事件是会单独处理的



## React17和React18的不同

`react17`中事件是统一绑定在`document`节点上，而18是绑定在挂载的根结点上。主要是以下考虑：

1. **更好的事件隔离**：将事件处理器绑定到 root 节点上，可以更好地隔离不同的 React 应用。如果页面上运行着多个 React 应用，这种方式可以防止一个应用的事件处理干扰到另一个应用。
2. **避免冒泡到 document**：在 React 17 及之前版本中，所有的事件处理器都绑定在 document 上，这意味着非react节点产生的事件都会冒泡到 document 层级。这种行为在某些情况下可能不是必需的，甚至可能引起性能问题。通过将事件处理器绑定到 root 节点，可以避免不必要的事件冒泡，从而提高性能。
3. **更好的兼容性和封装性**：将事件绑定在更接近组件的位置（即 root 节点），有助于保持组件的封装性，使得组件和应用更加独立。这也有助于在使用 Shadow DOM 等 Web 组件时，提供更好的兼容性。
4. **简化事件处理逻辑**：通过将事件处理逻辑保持在更局部的范围内（即 root 节点），React 可以更简单地管理事件，减少对全局事件监听的依赖，这在复杂应用中可以简化事件管理。

# React18 事件行为

```js
import { useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const parentRef = useRef();
  const childRef = useRef();

  const parentBubble = () => {
    console.log('父元素React事件冒泡');
  };
  const childBubble = () => {
    console.log('子元素React事件冒泡');
  };
  const parentCapture = () => {
    console.log('父元素React事件捕获');
  };
  const childCapture = () => {
    console.log('子元素React事件捕获');
  };

  useEffect(() => {
    parentRef.current.addEventListener(
      'click',
      () => {
        console.log('父元素原生捕获');
      },
      true,
    );

    parentRef.current.addEventListener('click', () => {
      console.log('父元素原生冒泡');
    });

    childRef.current.addEventListener(
      'click',
      () => {
        console.log('子元素原生捕获');
      },
      true,
    );

    childRef.current.addEventListener('click', () => {
      console.log('子元素原生冒泡');
    });

    document.addEventListener(
      'click',
      () => {
        console.log('document原生捕获');
      },
      true,
    );

    document.addEventListener('click', () => {
      console.log('document原生冒泡');
    });
  }, []);

  return (
    <div ref={parentRef} onClick={parentBubble} onClickCapture={parentCapture}>
      <div ref={childRef} onClick={childBubble} onClickCapture={childCapture}>
        点击这里
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

当我们点击之后，打印的结果如下图：

```js
/**
document原生捕获
父元素React事件捕获
子元素React事件捕获
父元素原生捕获
子元素原生捕获
子元素原生冒泡
父元素原生冒泡
子元素React事件冒泡
父元素React事件冒泡
document原生冒泡
 */
```

整个执行顺序如下图所示：

![image-20241111171107192](./assets/image-20241111171107192.png)

如果不理解没关系我们下面会结合源码详细讲解。

## 解析触发过程

上面代码层级如下 `document` -> `root` -> `div` -> `p`。根据事件触发原理，捕获阶段的事件会最先处理

1. 所以`document` 注册的捕获事件最先触发。
2. `root` 注册的捕获事件触发，React 根据当前点击的 `event.target` 上的`internalContainerInstanceKey`属性找到对应的`fiber`节点。然后从当前`fiber`节点网上收集`internalPropsKey`属性中含有当前捕获事件的函数放入数组中。收集完成之后对数组倒序触发，模拟捕获的行为。所以这时候`react`中绑定的捕获会先触发
3. `div` 注册的原生捕获事件触发。
4. `p` 注册的原生捕获事件触发。
5. `p` 注册的原生冒泡事件触发。
6. `div` 注册的原生冒泡事件触发。
7. `root` 注册的冒泡事件触发，同理会通过`fiber`节点向上收集。然后正序触发。
8. `document` 注册的冒泡事件触发。

# 源码部分

入口文件 [ReactDOMRoot](https://link.juejin.cn?target=https%3A%2F%2Fgithub1s.com%2Ffacebook%2Freact%2Fblob%2FHEAD%2Fpackages%2Freact-dom%2Fsrc%2Fclient%2FReactDOMRoot.js) 文件中的 `listenToAllSupportedEvents` 方法，在 root 根 fiber 创建完之后绑定事件

## 1. 绑定所有简单事件

```js
js

 代码解读
复制代码SimpleEventPlugin.registerEvents();

const listeningMarker =
  '_reactListening' +
  Math.random()
    .toString(36)
    .slice(2);
export function listenToAllSupportedEvents(rootContainerElement: EventTarget) {
  if (!(rootContainerElement: any)[listeningMarker]) {
    (rootContainerElement: any)[listeningMarker] = true;
    allNativeEvents.forEach(domEventName => {
      // We handle selectionchange separately because it
      // doesn't bubble and needs to be on the document.
      if (domEventName !== 'selectionchange') {
        if (!nonDelegatedEvents.has(domEventName)) {
          listenToNativeEvent(domEventName, false, rootContainerElement);
        }
        listenToNativeEvent(domEventName, true, rootContainerElement);
      }
    });
  }
}
```

1. `SimpleEventPlugin.registerEvents()` 方法会为我们的 `allNativeEvents` 注册事件，`allNativeEvents` 是一个 `Set` 集合。
2. 首先看 `#root` 节点上是否绑定过事件代理了，如果第一次绑定就 `rootContainerElement[listeningMarker] = true`，防止多次代理。
3. `allNativeEvents` 是所有的原生事件（内容比较多，可点击跳转源码搜索 [simpleEventPluginEvents](https://link.juejin.cn?target=https%3A%2F%2Fgithub1s.com%2Ffacebook%2Freact%2Fblob%2FHEAD%2Fpackages%2Freact-dom-bindings%2Fsrc%2Fevents%2FDOMEventProperties.js%23L36)），因为有一些事件是没有冒泡行为的，比如  `scroll`事件等 ，所以在这里根据 `nonDelegatedEvents` 区分一下是否需要绑定冒泡事件。
4. `listenToNativeEvent` 其实就是给我们的 `root` 事件通过 `addEventListener` 来绑定真正的事件，实现事件代理。

## 2. SimpleEventPlugin.registerEvents

说一下 `allNativeEvents` 赋值的过程

1. 调用SimpleEventPlugin插件的registerEvents方法注册事件

```js
js

 代码解读
复制代码SimpleEventPlugin.registerEvents();
```

1. registerSimpleEvents

```js
js

 代码解读
复制代码// registerEvents 就是 registerSimpleEvents，内部导出的时候重命名了
let topLevelEventsToReactNames = new Map()
function registerSimpleEvents() {
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = ((simpleEventPluginEvents[i]: any): string);
    const domEventName = ((eventName.toLowerCase(): any): DOMEventName);
    const capitalizedEvent = eventName[0].toUpperCase() + eventName.slice(1);
    registerSimpleEvent(domEventName, 'on' + capitalizedEvent);
  }
}

function registerSimpleEvent(domEventName: DOMEventName, reactName: string) {
  topLevelEventsToReactNames.set(domEventName, reactName);
  registerTwoPhaseEvent(reactName, [domEventName]);
}

export function registerTwoPhaseEvent(
  registrationName: string,
  dependencies: Array<DOMEventName>,
): void {
  registerDirectEvent(registrationName, dependencies);
  registerDirectEvent(registrationName + 'Capture', dependencies);
}

export function registerDirectEvent(registrationName, dependencies) {
  for (let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i])
  }
}
```

1. `eventName` 就是 `click`、`drag`、`close` 等这些简单事件。
2. `capitalizedEvent` 就是 `React` 里绑定的事件了，比如上述的 `click`、`drag`、`close` 会转成 `onClick`, `onDrag`, `onClose`。
3. `topLevelEventsToReactNames` 是个 `Map`，用来建立原生事件跟 `React` 事件的映射，到时候根据触发的事件来找到 React 里映射的事件，收集 `fiber` 上的 `props` 对应的事件。
4. `registerTwoPhaseEvent` 方法注册捕获 + 冒泡阶段的事件。
5. `registerDirectEvent` 是真正的给 `allNativeEvents`这个 `Set` 赋值。

OK，到这里我们 `root` 节点就已经通过事件管理绑定了所有的简单事件。
 接下来就是事件触发的过程

## 3. 事件触发的函数

1. dispatchDiscreteEvent

```js
js

 代码解读
复制代码/**
 * @param {*} domEventName click 等事件名
 * @param {*} eventSystemFlags 0 冒泡  4 捕获
 * @param {*} container #root 根节点
 * @param {*} nativeEvent 原生事件 event
 */
function dispatchDiscreteEvent(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  container: EventTarget,
  nativeEvent: AnyNativeEvent,
) {
  try {
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  }
}
```

1. dispatchEvent

```js
js

 代码解读
复制代码export function dispatchEvent(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): void {
  dispatchEventOriginal(
      domEventName,
      eventSystemFlags,
      targetContainer,
      nativeEvent,
  );
}
```

1. dispatchEventOriginal

```js
js

 代码解读
复制代码function dispatchEventOriginal(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
) {
  dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    null,
    targetContainer,
  );
}
```

1. dispatchEventForPluginEventSystem

```js
js

 代码解读
复制代码export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  dispatchEventsForPlugins(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  )
}
```

1. dispatchEventsForPlugins

```js
js

 代码解读
复制代码/**
 * 
 * @param {*} domEventName click  等原生事件
 * @param {*} eventSystemFlags 0是冒泡，4 是捕获
 * @param {*} nativeEvent 原生事件 event
 * @param {*} targetInst 当前点击 DOM 节点对应的 fiber 节点
 * @param {*} targetContainer #root
 */
function dispatchEventsForPlugins(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetInst: null | Fiber,
  targetContainer: EventTarget,
): void {
  const nativeEventTarget = getEventTarget(nativeEvent);
  const dispatchQueue: DispatchQueue = [];
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer,
  );
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}


export function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0 //true 就是捕获
  for (let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i]
    processDispatchQueueItemsInOrder(event, listeners, inCapturePhase)
  }
}

function processDispatchQueueItemsInOrder(
  event: ReactSyntheticEvent,
  dispatchListeners: Array<DispatchListener>,
  inCapturePhase: boolean,
): void {
  let previousInstance;
  if (inCapturePhase) {
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      const {instance, currentTarget, listener} = dispatchListeners[i];
      if (instance !== previousInstance && event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
      previousInstance = instance;
    }
  } else {
    for (let i = 0; i < dispatchListeners.length; i++) {
      const {instance, currentTarget, listener} = dispatchListeners[i];
      if (instance !== previousInstance && event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
      previousInstance = instance;
    }
  }
}

function executeDispatch(event, listener, currentTarget) {
  event.currentTarget = currentTarget
  listener(event)
  event.currentTarget = null
}
```

1. `getEventTarget` 就是获取 `event.target`，也就是我们在页面上点击的 DOM 节点。
2. `extractEvents` 方法会根据传过去的 `domEventName`（比如这个事件是 `click`），去`targetInst` 这个 fiber 节点上去收集 `props` 里的 `onClick` 事件，`fiber.return` 指的就是 `targetInst` 的父 `fiber`，比如当前点击的 `p` 标签，`targetInst`就是 `p` 标签的 fiber，`targetInst.return`指的就是 `div` 的 `fiber` 节点，然后一直递归收集到 `dispatchQueue` 队列里面，最终 `dispatchQueue` 队列的数据结构就是
    `[{event：合成事件源, listener:  [{instance: p 标签的 fiber，listener：对应 p 标签的 onClick 事件，currentTarget：p 标签 DOM 节点}, div 标签的 {instance, listener, currentTarget}]}]`。
3. `processDispatchQueue` 开始去执行我们收集的事件。
4. `processDispatchQueueItemsInOrder` 会判断如果当前是捕获阶段，那就倒序遍历执行我们的 `dispatchListeners`，如果是冒泡阶段，就正序遍历执行 `dispatchListeners`，遍历过程中还需要更改事件源上的 `currentTarget` 属性。
5. 整个事件阶段就完成了。

作者：lisen6
链接：https://juejin.cn/post/7191308289177550906
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。