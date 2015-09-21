;
(function($, window, document, undefined) {
    function Waterfall(elem, opts) {
        this.$element = $(elem);
        this.options = $.extend(true, {}, Waterfall.DEFAULTS, opts);
        this.colHeightArray = []; // columns height array
        this._init();
    }

    Waterfall.DEFAULTS = {
        colWidth: 300, //列宽度
        margin: 10, // 砖块间距number||[margin-top,margin-left]
        itemSelecter: '.waterfall-item', //砖块的 selecter
        resizable: true, // 窗口大小调整时重排

        pageUrl: undefined, // 如'data.json?page={{pageNum}}'这样的字符串,pageNum为int初始值为1每次请求自增1
        maxPage: undefined, // 最大页数，pageNum不能超过最大页数
        reqParams: {}, //请求的其他参数
        dataType: 'json', //数据类型json|jsonp|html
        onError: function(error) {
            console || console.log(error)
        }, //请求出错时执行
        template: '<div class="waterfall-item"><img src="{{img}}" alt="pic"></div>',
        dataAdapter: function(data) {
            return data
        }, //处理返回的原始数据,使数据符合compile函数中data参数的要求
        compile: function(tpl, data) {
            var html = '',
                len = data.length,
                i;

            for (i = 0; i < len; i++) {
                html += tpl.replace(/{{\w+}}/g, function(str) {
                    return data[i][str.slice(2, -2)] || '';
                })
            }
            return html;
        },

        bufferDistance: 50 //距离底部0像素时请求数据
    };

    Waterfall.prototype = {
        _init: function() {
            var _ = this;
            this._setColumns();
            this._initContainer();
            this._resetColumnsHeightArray();
            this.reLayout();
            this.status = {
                pageNum: 1,
                loading: false,
                rendering: false,
                isBeyondMaxPage: false
            }

            // bind resize
            if (_.options.resizable) {
                _._resize();
            }

            // bind resize
            if (_.options.pageUrl) {
                _._scroll();
            }
        },

        /**
         * 取得总列数
         */
        _getColumns: function() {
            var _ = this,
                width = _.$element.width(),
                cols = Math.floor(width / _.options.colWidth);
            return cols;
        },

        /**
         * 设置总列数
         */
        _setColumns: function() {
            this.cols = this._getColumns();
        },

        /*
         * 初始化容器
         */
        _initContainer: function() {
            this.$element.css({
                'position': 'relative',
                'display': 'block'
            });
        },

        /*
         * 重置列高度
         */
        _resetColumnsHeightArray: function() {
            var _ = this,
                cols = _.cols,
                i;

            _.colHeightArray.length = cols;

            for (i = 0; i < cols; i++) {
                _.colHeightArray[i] = 0;
            }
        },

        /*
         * 布局
         */
        _layout: function($content) {
            var _ = this,
                margin = _.options.margin,
                marginTop = margin[0] || margin,
                marginLeft = margin[1] || margin;

            $content.each(function(k, v) {
                var index = $.inArray(Math.min.apply(Math, _.colHeightArray), _.colHeightArray),
                    $v = $(v);

                $v.addClass('placed').css({
                    'position': 'absolute',
                    'top': _.colHeightArray[index],
                    'left': (marginLeft + _.options.colWidth) * index,
                    'width': _.options.colWidth
                });

                var itemHeight = $v.height()
                _.colHeightArray[index] += itemHeight + marginTop;
            });

            _.$element.animate({
                'height': Math.max.apply(Math, _.colHeightArray) - marginTop
            }, 'fast');
            _.status.rendering = false;
        },


        /*
         * 全部重新布局
         */
        reLayout: function() {
            var _ = this,
                $content = _.$element.find(_.options.itemSelecter);

            this._resetColumnsHeightArray();

            _._imagesLoaded($content, function() {
                _._layout($content);
            });
        },

        /*
         * 绑定窗口缩放事件
         */
        _resize: function(callback) {
            var _ = this,
                t,
                newCols;

            $(window).on('resize', function() {
                if (t) {
                    clearTimeout(t);
                }
                t = setTimeout(function() {
                    newCols = _._getColumns();
                    if (newCols !== _.cols) {
                        _.cols = newCols;
                        _.reLayout();
                    }
                }, 100);
            })
        },


        /*
         * 是否滚动到底部
         */
        _isNearBottom: function() {
            var _ = this,
                minColHeight = Math.min.apply({}, _.colHeightArray),
                distance = _.$element.offset().top + minColHeight - $(window).scrollTop() - $(window).height();

            return (distance < _.options.bufferDistance);
        },

        /*
         * 绑定滚动事件
         */
        _scroll: function() {
            var _ = this,
                t;

            $(window).on('scroll', function() {
                if (t) {
                    clearTimeout(t);
                }
                t = setTimeout(function() {
                    if (_._isNearBottom() 
                        && !_.status.isBeyondMaxPage 
                        && !_.status.loading 
                        && !_.status.rendering) {
                        _._loadData();
                    }
                }, 100);
            })
        },

        /*
         * 获取数据
         */
        _loadData: function() {
            var _ = this,
                maxPage = _.options.maxPage,
                pageNum = _.status.pageNum,
                pageUrl = _.options.pageUrl.replace('{{pageNum}}', pageNum);

            _.status.loading = true;
            $.ajax({
                url: pageUrl,
                data: _.options.reqParams,
                dataType: _.options.dataType,
                success: function(data) {
                    _.status.pageNum++;
                    if (maxPage !== undefined && _.status.pageNum > maxPage) {
                        _.status.isBeyondMaxPage = true;
                    }
                    _.status.rendering = true;
                    _.status.loading = false;
                    _._handleData(data);
                },
                error: function(error) {
                    _._handleError(error);
                    _.status.loading = false;
                }
            });
        },

        /*
         * 处理数据
         */
        _handleData: function(data) {
            var _ = this,
                tpl = _.options.template,
                html = '';

            if (_.options.dataType === 'html') {
                html = data;
            } else {
                data = _.options.dataAdapter(data);
                html += _.options.compile(tpl, data);
            }
            var $content = $(html).appendTo(_.$element);
            _._imagesLoaded($content, function() {
                _._layout($content);
            });
        },

        /*
         * 处理错误
         */
        _handleError: function(error) {
            this.options.onError(error);
        },

        /*
         * 图片下载完成后执行回调
         */
        _imagesLoaded: function($content, callback) {
            if (!$.isFunction(callback)) {
                return false;
            }
            var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                $images = $content.find('img').add($content.filter('img')),
                loaded = [];

            if (!$images.length) {
                callback($images);
            } else {
                $images.on('load.imagesLoaded error.imagesLoaded', function(event) {
                    var img = event.target;
                    if (img.src === BLANK || $.inArray(img, loaded) !== -1) {
                        return;
                    }
                    loaded.push(img);
                    if ($images.length === loaded.length) {
                        callback($images);
                        $images.off('.imagesLoaded');
                    }
                }).each(function(k, el) {
                    var src = el.src;
                    //hack 防止在执行js之前图片就已经加载完毕
                    if (el.readyState || el.complete) {
                        el.src = BLANK;
                        el.src = src;
                    }
                });
            }
        }
    };

    $.fn.waterfall = function(opts) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data('waterfall');
            var options = typeof opts == 'object' && opts;

            if (!data) {
                $this.data('waterfall', (data = new Waterfall(this, options)));
            }
            if (typeof opts == 'string' && opts.charAt(0) !== '_') {
                var args = Array.prototype.slice.call(arguments, 1);
                data[opts]().apply(data, args);
            }
        });
    };
}(jQuery, window, document));