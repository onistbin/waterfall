/*
*
*
* 页面简单的样式设置
*
* 
	.box{
	    padding: 15px 0 0 15px;
	}
	.pic{
	    padding: 10px;
	    border:1px solid #ccc;
	    box-shadow: 0 0 6px #ccc;
	    border-radius: 5px;
	}

*	页面结构，需要命名一个id	
	<div id="main">
	</div>	
*
*调用简单配置
	数据请求回调用了jQuery，故要引入jQuery
* 
*/

window.onload = function(){
	
	var waterfallObj = new Waterfall({
		containerId: 'main',     				//外层盒子
		containImgClassName: 'box',   			//包图片的盒子
		imgWidth: 162,							//图片宽度，默认162
		firstRender: 80,						//首次渲染张数,默认80
		onceLoadNum: 40,						//滚动一次加载的张数,默认40
		maxImgNum: 400,							//最多加载的图片数,默认400
		resize: true,							//是否随窗口大小列数变化，默认为true
		url: 'http://api.xiaohua.360.cn/Baoxiao/listData?callback=__callback&tag=&page=1'
	});

}

/*
	配置模板，调用数据
*/
var layoutTpl  = [
    '<div class="box">',
        '<div class="pic">',
            '<img src="{imgsrc}" />',
        '</div>',
	'</div>'
].join('');

var Class = { 
	createClass: function() { 
		return function() { 
			this.init.apply(this, arguments);
		} 
	} 
} 

var Waterfall = Class.createClass(); 

Waterfall.prototype = {

	init: function(options){

		/*
			config,init
		*/

		this.contain       = document.getElementById(options.containerId);
		this.containImgBox = this.contain.getElementsByClassName(options.containImgClassName);
		this.imgWidth      = options.imgWidth || 162;
		this.url           = options.url;
		this.firstRender   = options.firstRender || 50;
		this.onceLoadNum   = options.onceLoadNum || 40;
		this.maxImgNum     = options.maxImgNum || 400;
		this.resizeValue       = options.resize || true;

		if( !this.contain ){

	        return false;
	    }
	    else{

	    	this.firstRenderHtml();
			this.positionFn();
	    }  
	},

	/*
		图片定位，布局
	*/
	positionFn: function(){

		var _this = this,
			heightArr = [],
			img = this.contain.getElementsByTagName('img');

		this.contain.style.position = "relative";
		this.contain.style.margin   = "auto";

		for( var i = 0, len = this.containImgBox.length; i < len; i++){

			img[i].style.width = this.imgWidth + 'px';
			this.containImgBox[i].style.position = "";
			this.containImgBox[i].style.float = "left";

			if( i < this.countColNum()){

				heightArr[i] = this.containImgBox[i].offsetHeight;
			}

			else{
				var minHeight = Math.min.apply(null, heightArr);
				var index = getMinheightIndex(minHeight, heightArr);

				this.containImgBox[i].style.position = "absolute"
				this.containImgBox[i].style.top  = minHeight + 'px';
				this.containImgBox[i].style.left = this.containImgBox[index].offsetLeft + 'px';
				heightArr[index] += this.containImgBox[i].offsetHeight;
			}

		}
		if(this.resizeValue){
			this.resize();
		}
		
		this.scrollLoad();
	},


	/*
		通过屏幕宽度计算最多能容纳的列数
	*/
	countColNum: function (){

		var clientW = document.documentElement.clientWidth,
			offsetW = this.containImgBox[0].offsetWidth,
			containCol = Math.floor(clientW / offsetW);

		this.contain.style.width = offsetW * containCol + 'px';

		return containCol;
	},

	firstRenderHtml: function(){
		
		this.getContent();
	},

	resize: function(){

		var self = this;

		window.onresize = function(){
			self.positionFn();
		};
	},


	/*
		判断滚动位置，添加数据
	*/
	scrollLoad: function(){

		var _this = this;

		window.onscroll = function(){

			if( _this.judgeScrollLoad() ){

           		_this.getContent();
			}
		}

	},

	judgeScrollLoad: function (){
		var lastBoxTop = this.containImgBox[this.containImgBox.length -1 ].offsetTop + Math.floor(this.containImgBox[this.containImgBox.length -1 ].offsetHeight / 2), 
			scrollTop = document.documentElement.scrollTop || document.body.scrollTop,
			documentH = document.documentElement.clientHeight || document.body.clientHeight;

		if(lastBoxTop < scrollTop + documentH){
			return true;
		}
		else{
			return false;
		}
	},

	/*
		加载数据
	*/
	getContent: function () {

		var _this = this;

		$.ajax({
			type : "get",
			async: false,
			url: _this.url,
			dataType : "jsonp",
			jsonp: "callbackparam",
			jsonpCallback:"__callback",
			success : function(res){

				_this.renderHtmlFn(res);
				_this.positionFn();
			}
	    });
	},

	renderHtmlFn: function (res){
		var html = "";
		for(var i = 0; i < this.onceLoadNum; i++){
	    	if($(this.contain).find("img").length >= this.maxImgNum){
				return;
			}

	        html += layoutTpl.replace('{imgsrc}', res.content_list[i].pic);
	    }

	    this.contain.innerHTML = html;

	}
};


/*
	得到最短高度的索引值
*/
function getMinheightIndex(value, arr){

	if( arr.length == 0){

		return;
	}

	for( var i = 0, len = arr.length; i < len; i++){

		if( value == arr[i]){

			return i;
		}
	}
}
