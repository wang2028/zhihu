# zhihu

> A spider, by which you can get a markdown file saving your zhihu collections <br>
> 简单来说，这是一个小爬虫，通过这一百多行代码你就能获得一个存有你所有知乎收藏内容的 markdown 文件

不用知识储备，即使有涉及 node，但仅仅用起来不需要了解太多...

步骤很简单：

* 安装 node.js（从官网下载对应系统的安装包，并随手百度或谷歌一个教程安装一下，无需特殊配置，安装好后随手打开命令行输入 node -v，出现版本即为成功）

* 创建一个文件夹，将我的 zhihu.js 放进去

* 安装两个包：cheerio（一个很好用的将 html 变成 jquery 对象的东西），superagent（一个爬虫库，用来发起请求），安装过程：
  * 在文件夹的目录下打开命令行（或打开命令行 cd 到文件夹目录）
  * npm install cheerio --save
  * npm install superagent --save
  
* 这样，环境就配置好了，接着


* 手动从浏览器中找到 cookie 替换代码中的 cookie 字段，以 chrome 为例，步骤：
  * 访问并登陆知乎
  * 右键 “检查”（也就是开发者工具）
  * 找到 “network”（网络标签）
  * 按 F5 刷新一下，会看到很多请求
  * 在这滚动到最上面，有一行 “Type” 值为 “document” 的，点击一下查看，
  * 点 “Headers”，往下翻翻找到一个 “cookie” 字段，赋值这个 cookie 值就得到了你的 cookie
  * 粘贴到 zhihu.js 代码中的 `let cookie = '这里写你复制来的 cookie';` 这里面
  
* 运行代码
  * 在当前文件夹打开命令行，运行 node zhihu.js
  * 会看到很多输出字符串...因为这个小爬虫怕被封，所以它爬的会慢一点，你多等一会儿
  * 看到 write done 字样的时候基本就快结束了，如果它没动静了或者命令行直接消失了，就结束了...
  * 在这个文件夹你看有没有一个叫 zhihu.md 的文件，这个 markdown 文件就是你的收藏了

Ps...代码有点乱...见谅...
PPs...第一次使用 github 发布代码，如有建议或问题可尽情联系我 toacme.w@gmail.com
