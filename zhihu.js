const cheerio = require('cheerio');
const superagent = require('superagent');
const fs = require('fs');

// 这里换成从浏览器中找到的自己的 cookie：
let cookie = 'd_c0="AABCU7Vp8gqPTo-S03XIKNxNs0-kNcLIGbE=|1480846747"; _zap=9fa78242-2d40-42ee-b4e7-30d0d134f95f; _ga=GA1.2.1094427016.1487321486; q_c1=9c214e51964b4c2c9f2303def17e2b88|1501125978000|1490444342000; __DAYU_PP=vUQB3BqZeFyE2ny2imZA22f02130c11e; _xsrf=LOkI2SbM3f16FPca16EpAFwbUYIBjfyv; q_c1=9c214e51964b4c2c9f2303def17e2b88|1530677085000|1490444342000; capsion_ticket="2|1:0|10:1530677089|14:capsion_ticket|44:YjFjNjRhM2NkZWYwNGE5NDllOGY4Y2JjZTQ3NTRmZjY=|8f4232f477f208e5f9d5f39ba587d54c3525bbb8300263a37966e9209f8c9add"; z_c0="2|1:0|10:1530677091|4:z_c0|92:Mi4xZE9sOUFBQUFBQUFBQUVKVHRXbnlDaVlBQUFCZ0FsVk5ZNVVwWEFCdERENVlPSnNVLW4tT1RFbTk0UUJ0TzlOeWVn|0bc5246ecd7710531070b7585b1e3c9bdf6938930a14253d57ad54cbf0824e25"; __utma=155987696.1094427016.1487321486.1532015478.1532015478.1; __utmz=155987696.1532015478.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); tgw_l7_route=29b95235203ffc15742abb84032d7e75';

// 这里是要保存 markdown 的地址：
const mdPath  = "./zhihu.md";

const allCollections = [];
let rootUrl = 'https://www.zhihu.com/collections/mine';
let allSum = -1;

function getHtml(url, callback){
    // 获取网页的 html 内容
    superagent
        .get(url)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Cookie', cookie)
        .end(function (err, res) {
            callback(res.text);
        })
}

function getCollection(pageUrl, callback){
    getHtml(pageUrl, function (html) {
        let $ = cheerio.load(html);
        let curUrl = pageUrl;

        // cols 保存某个收藏夹的某页内容：
        let cols = {
            "title":$("div#zh-list-title>h2").eq(0).text().replace(/\n/g, "").trim(),
            "page":curUrl.indexOf("page=")==-1?1:curUrl.slice(curUrl.indexOf("page=")+5),
            "url": curUrl.replace(/\?page=.*/, ""),
            "content": []
        }

        // 获取该页每个收藏的标题、地址、作者、摘要：
        let divs = $("div#zh-list-collection-wrap>div.zm-item");
        for(let i = 0;i<divs.length;i++){
            let title = divs.eq(i).children("h2").children("a").text().replace(/\n/g, "").trim();
            let url = divs.eq(i).children("h2").children("a").prop("href");
            let author = divs.eq(i).children("div.zm-item-fav").find("a.author-link").text();
            let summary = divs.eq(i).children("div.zm-item-fav").find("div.zh-summary").text().replace(/\n/g, "").trim();
            cols.content.push({
                item:title,
                url:url,
                author:author,
                summary:summary
            })
        }

        let finded = false;
        for(let i = 0;i<allCollections.length;i++){
            if(cols.url == allCollections[i].url){
                // 若该收藏夹已有某页在 allCollections 中已有，则直接增加（push）其他页：
                allCollections[i].pages.push({
                    page:cols.page,
                    content:cols.content
                });
                finded = true;
                break;
            }
        }
        // 若该收藏夹任何一页都还没遍历到，则新增该收藏夹：
        if(!finded){
            allCollections.push({
                title:cols.title,
                url:cols.url,
                pages:[{
                    page:cols.page,
                    content:cols.content
                }]
            })
        }
        callback(1);
    })
}

allCollections.write2md = function () {
    // 写入 markdown：

    let tempmd = "";
    let md = "# 知乎收藏\n\n";
    let sum = 0;
    let sumUp = 0;
    let date = new Date();
    md += "> "+date.getFullYear()+"."+(date.getMonth()+1)+"."+date.getDate()+"\n\n<br>\n\n";
    fs.writeFile(mdPath, md, {
        flag:"a+"
    }, function (err) {
        if(err) console.log("!!! write title error: "+err);
    })

    let len = allCollections.length;
    for(let i = 0;i<len;i++){
        md = "";
        tempmd = "";
        sum = 0;
        console.log("start write: "+(i+1)+"/"+len);
        let thisSet = allCollections[i];
        thisSet.pages.sort(function (p1, p2) {
            if(p1.page<p2.page){
                return -1;
            }
            else if(p1.page>p2.page){
                return 1;
            }
            else{
                return 0;
            }
        });
        md+= "## " + thisSet.title + '\n\n';
        for(let j = 0;j<thisSet.pages.length;j++){
            let thisP = thisSet.pages[j];
            let contents = thisP.content;
            for(let k = 0;k<contents.length;k++){
                sum++;
                tempmd+= "##### ["+contents[k].item+"]("+contents[k].url+")\n";
                tempmd+= "__"+contents[k].author+"__ : ";
                tempmd+= contents[k].summary.replace("显示全部", "");
                tempmd+= '\n<br>\n';
            }
        }
        sumUp+=sum;
        md+= '> sum: ' + sum+", " + thisSet.url + '\n\n<br>\n\n';
        md+= tempmd;
        md+= '\n\n<br>\n\n';

        fs.writeFile(mdPath, md, {
            flag:"a+"
        }, function (err) {
            if(err){
                console.log("!!! error of"+thisSet.title+" : "+err);
            }
            else{
                console.log("write done: "+(i+1)+"/"+len);
            }
        });
    }
    fs.writeFile(mdPath, "\n\nsum: "+sumUp, {
        flag:"a+"
    }, function (err) {
        if(err){
            console.log("!!! write sum error: "+err);
        }
    })
    console.log("write done, sum: "+sumUp);
}

// 主程序开始：
getHtml(rootUrl, function (html) {
    let $ = cheerio.load(html);
    let a = $("div#zh-favlists-wrap>div>h2>a");
    allSum = a.length;
    a.each(function (index, ele) {
        // 每次延后开始（以防被封）：
        setTimeout(function () {
            console.log("start: " + $(ele).text()+" https://www.zhihu.com"+$(ele).prop("href"));
            getHtml("https://www.zhihu.com"+$(ele).prop("href"), function (html) {
                let $ = cheerio.load(html);
                let spans = $("div.border-pager>div>span");
                let n = parseInt(spans.eq(spans.length-2).children("a").text());
                let curN = 0;
                getCollection("https://www.zhihu.com"+$(ele).prop("href"), function (n) {
                    curN++;
                });
                if(n && n>1){
                    let i = 2;
                    let s = setInterval(function () {
                        if(i>n){
                            clearInterval(s);
                        }
                        else {
                            getCollection("https://www.zhihu.com"+$(ele).prop("href")+"?page="+i, function () {
                                curN++;
                            })
                            i++;
                        }
                    }, 3000);
                }
                if(!n){
                    n = 1;
                }
                let s1 = setInterval(function () {
                    if(curN == n){
                        clearInterval(s1);
                        allSum--;
                    }
                }, 2000);
            })
        }, 15000 * index);
    });
})

// 间隔 5s 检查是否完成爬取以开始写入文件：
let s2 = setInterval(function () {
    if(allSum == 0){ // 收藏夹遍历完成，开始写入：
        allCollections.write2md();
        clearInterval(s2);
    }
}, 5000);
