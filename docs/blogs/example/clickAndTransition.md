# 浏览器卡顿
如下代码可以实现原生防抖，[在线体验](https://codesandbox.io/p/sandbox/white-resonance-5q8ws7)。
```js
const BusyChild = React.memo(({ num }) => {
  const cur = performance.now();
  while (performance.now() - cur < 300) {}

  return <div>{num}</div>;
});

function App() {
  const [ctn, updateCtn] = useState("");
  const [num, updateNum] = useState(0);
  const [isPending, startTransition] = useTransition();

  const cur = performance.now();

  return (
    <div>
      <input
        value={ctn}
        onChange={function onChange({ target: { value } }) {
          updateCtn(value);
          startTransition(() => updateNum(num + 1));
        }}
      />
      <BusyChild num={num} />
    </div>
  );
}
```
体验起来是符合我们需求的，但是如果我们将`BusyChild`中`while (performance.now() - cur < 300) {}`改成`2000`就会出现奇怪的事情。
我们会发现`input`中出现的数字个数和时机好像不太固定了。其实和`react`没关系，是因为我们的`while`循环一直阻止了主线程。所以`UI`没办法渲染。然后具体展示的时机和浏览器实现又关系。上面的`react`可以用下面的原生代码复现。

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Input Event Listener</title>
  </head>
  <body>
    <input type="text" id="input1" placeholder="Type something..." />
    <input type="text" id="input2" placeholder="Type something..." />
    <script>
      // 获取输入框元素
      const inputElement1 = document.getElementById('input1');
      const inputElement2 = document.getElementById('input2');

      // 监听 input 事件
      inputElement2.addEventListener('input', function onInputChange(event) {
        const now = performance.now();
        // 模拟react执行耗时
        while (performance.now() - now < 300) {}
        // 修改input1的值
        inputElement1.value = event.target.value;
      });
    </script>
  </body>
</html>
```