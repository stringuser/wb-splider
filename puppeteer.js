const puppeteer = require('puppeteer')
const log4js = require('log4js')
const cheerio = require("cheerio")
const fs = require('fs')

// 日志数据
log4js.configure({
  appenders: {
    log_file: {
      type: "dateFile",
      filename: "log_file",
      pattern: "yyyy-MM-dd.log",
      alwaysIncludePattern: true,
    },
  },
  categories: {
    default: {
      appenders: ["log_file"],
      level: "debug"
    }
  }
})
let logger = log4js.getLogger("log_file")
logger.level = 'debug'

// 登陆
let userNameLogin = async (username, password) => {
  const browser = await puppeteer.launch({
    headless: true
  })
  const page = await browser.newPage()
  logger.debug("进入微博")
  await page.goto('https://s.weibo.com')
  let bottom = await page.waitForSelector('.gn_login_list a[node-type=loginBtn]')
  await bottom.click()
  let userLogin = await page.waitForXPath('//*[@node-type="username"]')
  await userLogin.focus()
  await page.keyboard.sendCharacter(username)
  let passWord = await page.waitForXPath('//*[@node-type="password"]')
  await passWord.focus()
  await page.keyboard.sendCharacter(password)
  let loginBtn = await page.waitForXPath('//*[@node-type="submitBtn"][1]')
  await loginBtn.click()
  logger.debug("登录ing")
  let loginCheck = await page.waitForXPath('//div[@class="gn_set_list"]').then(async () => {
    logger.debug("登录成功")
    await page.cookies().then(cookies => {
      let cookieJson = JSON.stringify(cookies)
      logger.debug(cookieJson)
      fs.writeFile('./cookies.txt', cookieJson, {
        flag: 'w',
        encoding: 'utf-8'
      }, (error) => {
        if (error) {
          logger.debug('cookies保存失败')
        } else {
          logger.debug('cookies保存成功')
        }
      })
    }).catch(async res => {
      logger.debug("获取cookies失败")
    })
    return {
      page,
      browser
    }
  }).catch(async () => {
    logger.debug("登录失败")
    await browser.close()
    return false
  })
  return loginCheck
}

// cookie登陆
let cookiesLogin = async () => {
  let cookies
  if (await fs.existsSync('./cookies.txt')) {
    cookies = await fs.readFileSync('./cookies.txt', 'utf-8')
    if (cookies) {
      logger.debug("cookie登录")
      const browser = await puppeteer.launch({
        headless: true
      })
      const page = await browser.newPage()
      logger.debug("进入微博")
      await page.setCookie(...JSON.parse(cookies));
      await page.goto('https://s.weibo.com/?Refer=')
      //判断是否完成登录
      let loginStatus = await page.waitForXPath('//div[@class="gn_set_list"]').then(async () => {
        logger.debug("登录成功")
        return true
      }).catch(async () => {
        logger.debug("登录失败")
        return false
      })
      if (loginStatus) {
        return {
          page,
          browser
        }
      } else {
        await browser.close()
        return false
      }
    } else {
      logger.debug("cookie不存在")
      return false
    }
  } else {
    logger.debug("cookie不存在")
    return false
  }

}

// 统计微博数量
let listData = async (page, url, browser) => {
  try {
    await page.goto(url)
  } catch {
    console.log('请输入正确的地址')
    logger.debug("错误的url")
    await browser.close()
    return false
  }
  logger.debug("进入指定页面")
  let scrollHeight = 0,
    divsList = [],
    nextPage = '1'
  // 查询数据
  let scrollDown = () => {
    logger.debug("开始下滑操作")
    return new Promise(resolve => {
      let scrollHtml = setInterval(async () => {
        let checkDown = await page.evaluate(scrollHeight => {
          offset = document.body.scrollHeight
          window.scroll(scrollHeight, offset)
          if (document.getElementsByClassName('WB_empty_narrow').length == 0) {
            return true
          } else {
            scrollHeight = offset
            return false
          }
        }, scrollHeight)
        if (checkDown) {
          clearInterval(scrollHtml)
          let pageList = await page.$$eval('.WB_feed_detail', divs => {
            return divs.map(div => {
              return div.outerHTML
            })
          });
          // 下一页

          nextPage = await page.$$eval('.page.next', divs => {
            return divs.map(div => {
              return div.outerHTML
            })
          })
          divsList = divsList.concat(pageList)
          resolve(nextPage)
        }
      }, 2000)
    })
  }
  logger.debug("进入循环")
  // 遍历微博页数
  while (nextPage && nextPage.length > 0) {
    await scrollDown().then(async () => {
      if (!nextPage || nextPage.length == 0) {
        return
      }
      _$ = cheerio.load(nextPage[0])
      logger.debug("开始翻页")

      let url = _$('a').attr('href')
      if (url) {
        url.replace(';', '&')
        logger.debug(`https://weibo.com${url}`)
        await page.goto(`https://weibo.com${url}`)
      } else {
        return
      }

      // console.log(res)
    })
  }

  logger.debug("下滑结束")
  logger.debug("统计数据")
  let excel = []
  divsList.forEach(res => {
    // 防止中文字符被转unicode
    let _$ = cheerio.load(res, {
      decodeEntities: false
    })
    let info = _$('[node-type=feed_list_content]')
    let avator = _$('.WB_detail>.WB_info>a').text().replace(/[\s\n]/g, '')
    let text = info.html()
    let imgList = []
    if (text) {
      // 把表情转成字符串,其他如tag视频则忽略
      if (info.find('img').length > 0) {
        info.find('img').each((res, el) => {
          imgList.push(_$(el).attr('title'))
        })
      }
      if (imgList && imgList.length > 0) {
        imgList.forEach(res => {
          let Reg = new RegExp(`<img([\\w\\W]*)${res}([\\w\\W]*)>`)
          text = text.replace(Reg, res)
        })
      }
      text = text.replace(/<([\w\W]*)>/, '').replace(/[\s\n]/g, '')
      excel.push({
        avator,
        text
      })
    }
  })
  logger.debug(`统计到${divsList ? divsList.length : '0' }条数据`)
  await browser.close()
  return excel
}

let login = {
  userNameLogin: userNameLogin,
  cookiesLogin: cookiesLogin,
  listData: listData
}
module.exports = login