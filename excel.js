let Excel = require('exceljs')
let excels = function (data, excelName) {
  let workbook = new Excel.Workbook();

  var date = new Date();
  var year = date.getFullYear();
  var mon = date.getMonth();
  var day = date.getDay();

  // 基本的创建信息
  workbook.creator = "splider";
  workbook.lastModifiedBy = "Her";
  workbook.created = new Date(1985, 8, 30);
  workbook.modified = new Date();
  workbook.lastPrinted = new Date(year, mon, day);
  workbook.properties.date1904 = true;

  // 视图
  workbook.views = [{
    x: 0,
    y: 0,
    width: 10000,
    height: 20000,
    firstSheet: 0,
    activeTab: 1,
    visibility: 'visible'
  }]

  var worksheet = workbook.addWorksheet('weibo');

  // 设置列
  worksheet.columns = [{
      header: '用户名',
      key: 'avator',
      width: 26
    },{
      header: '微博内容',
      key: 'text',
      width: 50
    }
  ];
  //添加值
  for (var i in data) {
    var item = data[i];
    worksheet.addRow(item);
  }

  // save workbook to disk
  workbook.xlsx.writeFile(excelName).then(function () {
    console.log("---saved---");
  });
}

module.exports = excels;