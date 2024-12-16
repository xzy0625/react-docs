# 奇怪的useEffect
## 可复现代码
```jsx
function wait(ms) {
  const endTime = new Date().valueOf() + ms;
  for (; new Date().valueOf() < endTime; ) {}
}

function App() {
  const [v, setV] = useState(1);
  // 在第二次渲染的时候等待，其实页面也不会展示111，因为这时候还在当前事件循环，要等当前时间循环执行完了才能执行页面渲染
  useLayoutEffect(() => {
    setV(2);
  }, []);

  return <Child />;
}

function Child() {
  const [str, setStr] = useState("111");

  useEffect(function create() {
    wait(2000);
    setStr("222");
  }, []);

  return <div>{str}</div>;
}
```

## 表现
按理来说`useEffect`是异步的，会在`dom`更新之后下一次事件循环执行，但是真实表现是页面会一直卡住，最后才展示222。

## 原理
1. 第一次是初次渲染(render lanes是16)，这时候`useEffect`会发起一个`scheduler`调度，在下一个事件循环中处理，lanes为16
2. 第二次是在同一个事件循环里useLayoutEffect的setV，此时lanes是1，因为是commit阶段发起的，所以会在当前事件循环的微任务中处理
3. 第三次是setV发起的渲染的commit的时候会先处理第一次的`useEffect`的事件，所以导致`useEffect`里的函数在当前事件循环就执行了。然后`wait`
阻塞了主线程（其实这个时候dom已经更新了，只是主线程没时间渲染）。最后发起`setStr`第三次调度，这个调度是异步的。
最后执行渲染,此时页面为`111`，然后在下一次事件循环执行`setStr`的调度。将页面更新为`222`。只是执行的很快，我们看不到111的展示。
这里有个关键点，如果一直在同步任务的话，是会阻止浏览器渲染的，所以就算我们已经调用了一次commit提交到dom，但是又同步(其实是微任务)发起了一次新的渲染。这时页面也不会更新(但是如果在这里打断点就会更新哈哈)

## 改变一下
如果我们在第三次渲染的时候才阻塞主线成的话是可以看到`111` 展示的
```jsx 
function wait(ms) {
  const endTime = new Date().valueOf() + ms;
  for (; new Date().valueOf() < endTime; ) {}
}

function App() {
  const [v, setV] = useState(1);
  // 在第二次渲染的时候等待，其实页面也不会展示111，因为这时候还在当前事件循环，要等当前时间循环执行完了才能执行页面渲染
  useLayoutEffect(() => {
    setV(2);
  }, []);

  return <Child />;
}

function Child() {
  const [str, setStr] = useState("111");

  if (str === '222') { // 加上这个就可以看到从111变成222的过程。 // [!code ++]
    wait(2000); // [!code ++]
  } // [!code ++]

  useEffect(function create() {
    wait(2000);
    setStr("222");
  }, []);

  return <div>{str}</div>;
}
```