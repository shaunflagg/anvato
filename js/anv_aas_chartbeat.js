 /** CONFIGURATION START **/
        var _sf_async_config={};
        _sf_async_config.uid = 31585;
        _sf_async_config.domain = 'statesman.com';
        _sf_async_config.useCanonical = true;
        // _sf_async_config.sections = 'section1,section2 ';
        // _sf_async_config.authors = 'author1,author2 ';
        /** CONFIGURATION END **/

        (function() {
            function loadChartbeat() {
                window._sf_endpt = (new Date()).getTime();
                var e = document.createElement('script');
                e.setAttribute('language', 'javascript');
                e.setAttribute('type', 'text/javascript');
                e.setAttribute('src', '//static.chartbeat.com/js/chartbeat_video.js');
                document.body.appendChild(e);
            }
            var oldonload = window.onload;
            window.onload = (typeof window.onload != 'function') ?
                loadChartbeat : function() {
                    oldonload();
                    loadChartbeat();
                };
        })();