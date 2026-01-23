// EdgeOne Pages Function export
export function onRequest(context) {
  return handleRequest(context.request);
}

// 检测是否为移动设备
function isMobileDevice(userAgent) {
  if (!userAgent) return false;
  
  var mobileKeywords = [
    'Mobile', 'Android', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 
    'Windows Phone', 'Opera Mini', 'IEMobile', 'Mobile Safari',
    'webOS', 'Kindle', 'Silk', 'Fennec', 'Maemo', 'Tablet'
  ];
  
  var lowerUserAgent = userAgent.toLowerCase();
  
  // 检查移动设备关键词
  for (var i = 0; i < mobileKeywords.length; i++) {
    if (lowerUserAgent.includes(mobileKeywords[i].toLowerCase())) {
      return true;
    }
  }
  
  // 检查移动设备正则表达式
  var mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent);
}

async function handleRequest(request) {
  try {
    var url = new URL(request.url);
    var imgType = url.searchParams.get('img');
    
    const maxHorizontalImageNumber = 882;
    const maxVerticalImageNumber = 3289;

    if (imgType === 'h') {
      // 生成1到maxHorizontalImageNumber之间的随机数
      var randomNum = Math.floor(Math.random() * maxHorizontalImageNumber) + 1;
      var imageUrl = '/ri/h/' + randomNum + '.webp';
      
      // 返回重定向
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else if (imgType === 'v') {
      // 生成1到maxVerticalImageNumber之间的随机数
      var randomNum = Math.floor(Math.random() * maxVerticalImageNumber) + 1;
      var imageUrl = '/ri/v/' + randomNum + '.webp';
      
      // 返回重定向
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else if (imgType === 'ua') {
      // 根据User-Agent检测设备类型
      var userAgent = request.headers.get('User-Agent') || '';
      var isMobile = isMobileDevice(userAgent);
      
      if (isMobile) {
        // 移动设备，返回竖屏图片
        var randomNum = Math.floor(Math.random() * maxVerticalImageNumber) + 1;
        var imageUrl = '/ri/v/' + randomNum + '.webp';
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': imageUrl,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        // 桌面设备，返回横屏图片
        var randomNum = Math.floor(Math.random() * maxHorizontalImageNumber) + 1;
        var imageUrl = '/ri/h/' + randomNum + '.webp';
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': imageUrl,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } else {
      // 显示使用说明
      var helpText = '🖼️ 随机图片展示器\n\n';
      helpText += '使用方法:\n';
      helpText += '• ?img=h - 获取横屏随机图片\n';
      helpText += '• ?img=v - 获取竖屏随机图片\n';
      helpText += '• ?img=ua - 根据设备类型自动选择图片\n';
      
      return new Response(helpText, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    var errorDetails = '❌ 内部错误\n\n';
    errorDetails += '错误消息: ' + error.message + '\n';
    errorDetails += '错误堆栈: ' + error.stack + '\n';
    errorDetails += '请求地址: ' + request.url + '\n';
    errorDetails += '时间戳: ' + new Date().toISOString();
    
    return new Response(errorDetails, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
