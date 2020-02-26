const http = require('https')
const fs = require('fs')
const readline = require('readline');
const excels = require('./excel')
const login = require('./puppeteer')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
let userName, passWord, url, excelName = "";
rl.question('输入账号 : ', uName => {
  rl.question('输入密码 : ', pWord => {
    rl.question('查询的微博链接 : ', u => {
      userName = uName;
      passWord = pWord;
      url = u;
      let date = new Date()
      excelName = `${date.getFullYear()}-${1 + date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.xlsx`;
      rl.close();
    })
  });
});
rl.on('close', async (res) => {
  let data = await login.cookiesLogin()
  if (data) {
    let excelData = await login.listData(data.page, url, data.browser)
    if (excelData.length > 0)  {
      excels(excelData, excelName)
    }
  } else {
    let i = 0
    console.log('账号密码登陆')
    while(i < 3 ) {
      let loginStatus = await login.userNameLogin(userName, passWord)
      if (loginStatus) {
        i = 10
        let excelData = await login.listData(loginStatus.page, url, loginStatus.browser)
        if (excelData && excelData.length > 0)  {
          excels(excelData, excelName)
        }
      } else {
        console.log('登陆失败，重新登陆' + (i + 1) + '次')
        i ++ 
      }
    }
    if (i >= 3 && i != 10) {
      console.log('登陆失败，请重试')
    }
  }
})