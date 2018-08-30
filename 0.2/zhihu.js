const cheerio = require('cheerio');
const superagent = require('superagent');
const fs = require('fs');
const db = require('./db');

function genName(homeUrl) {
    // 只需传入自己的主页的网址，如：https://www.zhihu.com/people/wang-xiang-wei-93/activities
    let pos = homeUrl.indexOf("people/");
    if(pos==-1){
        return false;
    }
    let name = homeUrl.slice(pos+7);
    if(name.indexOf('/')!=-1){
        name = name.slice(0, name.indexOf('/'));
    }
    return name;
}

function getHtml(url, callback){
    // 获取网页的 html 内容
    superagent
        .get(url)
        .set('Content-Type', 'text/html; charset=utf-8')
        .end(function (err, res) {
            console.log(url+":");
            callback(res.text);
        })
}

function getCollection(pageUrl, allCollections, allSum, callback){
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
            if(!url){
                continue;
            }
            if(url[0]=='/'){
                url = "https://www.zhihu.com"+url;
            }
            let author = divs.eq(i).children("div.zm-item-fav").find("a.author-link").text();
            let summary = divs.eq(i).children("div.zm-item-fav").find("div.zh-summary").text().replace(/\n/g, "").trim();
            cols.content.push({
                item:title,
                url:url,
                author:author,
                summary:summary.replace("显示全部", "")
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

function write2db(name, allCollections) {
    // 写入 mongodb 数据库，这里也可换成 0.1 版本中 write2md 函数写到一个 md 文件中
    console.log("write"+name);
    db.updateData({
        "_id":name,
    }, {
        "data":allCollections
    }, "zh", function (err) {
        if(err){
            console.log("err: "+err);
        }
        else{
            console.log("完成！！！");
            return;
        }
    })
}

function main(rootUrl, results, callback){
    getHtml(rootUrl, function (html) {
        let $ = cheerio.load(html);
        let data = $("div#data").prop("data-state");
        let r1 = /"ids":(\[.*?\])/g;
        let aStr = "";

        data.replace(r1, function (str, idx, data) {
            aStr += str;
        })
        aStr = aStr.replace(r1, '$1');
        let as = aStr.split(/[\[\],]/);
        let curLen = results.length;
        for (let i = 0; i < as.length; i++) {
            if (as[i] && as[i] != 'false' && as[i]!='null') {
                results.push(as[i]);
            }
        }
        if(results.length == curLen){
            // 说明当前页已无内容
            callback(results);
            return;
        }
        else {
            // 当前页仍有内容，进行递归爬取下一页
            let nextPage = 2;
            if (rootUrl.indexOf("?page=") != -1) {
                nextPage = parseInt(rootUrl.slice(rootUrl.indexOf("?page=") + 6)) + 1;
                main(rootUrl.slice(0, rootUrl.indexOf("?page=")) + "?page=" + nextPage, results, callback);
            }
            else {
                main(rootUrl + "?page=" + nextPage, results, callback);
            }
        }
    })
}

let name = function (homeUrl, callback) {
    // 从知乎主页 url 获取用户名字（不是昵称，而是 url 中的用户名）
    
    callback(genName(homeUrl));
}

let start = function (userUrl, callback) {
    // 启动爬取的主函数

    let allCollections = [];
    let allSum = -1;

    let name = genName(userUrl);
    let rootUrl = `https://www.zhihu.com/people/${name}/collections`;

    getHtml(rootUrl, function (html) {
        let $ = cheerio.load(html);
        let data = $("div#data").prop("data-state");
        if (!data) {
            // 传入的 url 未找到真实用户：
            callback(false);
            return;
        }
        else {
            callback(true);

            // 主程序开始：
            let results = [];
            main(rootUrl, results, function (results) {

                // 间隔 5s 检查是否完成爬取以开始写入文件：
                let s2 = setInterval(function () {
                    if(allSum == 0){ // 收藏夹遍历完成，开始写入：
                        write2db(name, allCollections);
                        clearInterval(s2);
                    }
                }, 5000);
                allSum = results.length;
                results.every(function (val, idx) {
                    // 每次延后开始（以防被封）：
                    setTimeout(function () {
                        let colUrl = "https://www.zhihu.com/collection/"+val;
                        console.log("start: " + colUrl);
                        getHtml(colUrl, function (html) {
                            let $ = cheerio.load(html);
                            let spans = $("div.border-pager>div>span");
                            let n = parseInt(spans.eq(spans.length-2).children("a").text());
                            let curN = 0;
                            getCollection(colUrl, allCollections, allSum, function (n) {
                                curN++;
                            });
                            if(n && n>1){
                                let i = 2;
                                let s = setInterval(function () {
                                    if(i>n){
                                        clearInterval(s);
                                    }
                                    else {
                                        getCollection(colUrl+"?page="+i, allCollections, allSum, function () {
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
                    }, 10000 * idx);
                    return true; // every 函数的回调函数要有返回值
                });
            })
        }
    })
}

start('https://www.zhihu.com/people/wang-xiang-wei-93/activities', function (result) {
    if (result) {
        console.log("开始爬取");
    }
    else {
        console.log("用户不存在");
    }
})