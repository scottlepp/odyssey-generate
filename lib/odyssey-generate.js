function OdysseyGenerator() {

    var resizePID;

    function clearResize() {
        clearTimeout(resizePID);
        resizePID = setTimeout(function () {
            adjustSlides();
        }, 100);
    }

    if (!window.addEventListener) {
        window.attachEvent("resize", function load(event) {
            clearResize();
        });
    } else {
        window.addEventListener("resize", function load(event) {
            clearResize();
        });
    }

    function adjustSlides() {
        var container = document.getElementById("slides_container"),
            slide = document.querySelectorAll('.selected_slide')[0];

        if (slide) {
            if (slide.offsetHeight + 169 + 40 + 80 >= window.innerHeight) {
                container.style.bottom = "80px";

                var h = container.offsetHeight;

                slide.style.height = h - 169 + "px";
                slide.classList.add("scrolled");
            } else {
                container.style.bottom = "auto";
                container.style.minHeight = "0";

                slide.style.height = "auto";
                slide.classList.remove("scrolled");
            }
        }
    }

    var resizeAction = O.Action(function () {
        function imageLoaded() {
            counter--;

            if (counter === 0) {
                adjustSlides();
            }
        }

        var images = $('img');
        var counter = images.length;

        images.each(function () {
            if (this.complete) {
                imageLoaded.call(this);
            } else {
                $(this).one('load', imageLoaded);
            }
        });
    });

    function click(el) {
        var element = O.Core.getElement(el);
        var t = O.Trigger();

        // TODO: clean properly
        function click() {
            t.trigger();
        }

        if (element) element.onclick = click;

        return t;
    }

    O.Template({
        init: function () {
            var seq = O.Triggers.Sequential();

            var baseurl = this.baseurl = 'http://{s}.api.cartocdn.com/base-light/{z}/{x}/{y}.png';
            var map = this.map = L.map('map').setView([0, 0.0], 4);
            var basemap = this.basemap = L.tileLayer(baseurl, {
                attribution: 'data OSM - map CartoDB'
            }).addTo(map);

            // enanle keys to move
            O.Keys().on('map').left().then(seq.prev, seq);
            O.Keys().on('map').right().then(seq.next, seq);

            click(document.querySelectorAll('.next')).then(seq.next, seq);
            click(document.querySelectorAll('.prev')).then(seq.prev, seq);

            var slides = O.Actions.Slides('slides');
            var story = O.Story();

            this.story = story;
            this.seq = seq;
            this.slides = slides;
            this.progress = O.UI.DotProgress('dots').count(0);
        },

        update: function (actions) {
            var self = this;

            if (!actions.length) return;

            this.story.clear();

            if (this.baseurl && (this.baseurl !== actions.global.baseurl)) {
                this.baseurl = actions.global.baseurl || 'http://0.api.cartocdn.com/base-light/{z}/{x}/{y}.png';

                this.basemap.setUrl(this.baseurl);
            }

            if (this.cartoDBLayer && ("http://" + self.cartoDBLayer.options.user_name + ".cartodb.com/api/v2/viz/" + self.cartoDBLayer.options.layer_definition.stat_tag + "/viz.json" !== actions.global.vizjson)) {
                this.map.removeLayer(this.cartoDBLayer);

                this.cartoDBLayer = null;
                this.created = false;
            }

            if (actions.global.vizjson && !this.cartoDBLayer) {
                if (!this.created) { // sendCode debounce < vis loader
                    cdb.vis.Loader.get(actions.global.vizjson, function (vizjson) {
                        self.map.fitBounds(vizjson.bounds);

                        cartodb.createLayer(self.map, vizjson)
                            .done(function (layer) {

                                layer.on('featureClick', function (e, latlng, pos, data) {
                                    $.each(self.rows, function (i, row) {
                                        if (row.cartodb_id === data.cartodb_id) {
                                            self.story.go(i + 1);
                                            self.changeSlide(i + 1);
                                            return;
                                        }
                                    });
                                })
                                    .on('error', function (err) {
                                        console.log('error: ' + err);
                                    });

                                self.cartoDBLayer = layer;

                                var sublayer = layer.getSubLayer(0),
                                    layer_name = layer.layers[0].options.layer_name,
                                    filter = actions.global.cartodb_filter ? " WHERE " + actions.global.cartodb_filter : "";

                                var sql = "SELECT * FROM " + layer_name + filter;
                                sublayer.setSQL(sql);

                                var apiRoot = actions.global.vizjson;
                                apiRoot = apiRoot.substring(0, apiRoot.indexOf('/api/') + 8);

                                var query = apiRoot + 'sql?q=' + sql + '%20order%20by%20day%20asc';

                                $.getJSON(query, function (data) {
                                    self._generateSlides(actions, data.rows, self.map);
                                    self.rows = data.rows;
                                });

                                self.map.addLayer(layer);

                            }).on('error', function (err) {
                                console.log("some error occurred: " + err);
                            });
                    });

                    this.created = true;
                }

                return;
            }

            this._resetActions(actions);
        },

        _generateSlide: function (actions, index, template, action) {
            document.getElementById('slides').innerHTML += template;

            this.progress.step(index).then(this.seq.step(index), this.seq)

            var actions = O.Parallel(
                this.slides.activate(index),
                this.progress.activate(index),
                resizeAction,
                action
            );

            actions.on("finish.app", function () {
                adjustSlides();
            });

            this.story.addState(
                this.seq.step(index),
                actions
            )
        },

        _generateSlides: function (actions, rows, map) {
            // update footer title and author
            var config = actions.global;

            var title_ = config.title === undefined ? '' : config.title,
                author_ = config.author === undefined ? 'Using' : 'By ' + config.author + ' using';

            var description = config.description;
            document.getElementById('title').innerHTML = title_;
            document.getElementById('author').innerHTML = author_;
            document.title = title_ + " | " + author_ + ' Odyssey.js';

            document.getElementById('slides').innerHTML = ''
            this.progress.count(rows.length);

            var introTmpl = "<div class='slide' style='diplay:none'>";
            introTmpl += '<h1>' + title_ + '</h1>';
            introTmpl += '<p>' + description + '</p>';
            introTmpl += "</div>";

            this._generateSlide(actions, 0, introTmpl, function () {});

            // generate slides from rows
            for (var i = 0; i < rows.length; ++i) {
                var row = rows[i];
                var tmpl = "<div class='slide' style='diplay:none'>";

                tmpl += '<h2><strong>' + row[config.slideTitle] + '</strong></h2>';
                tmpl += '<p>' + row[config.fields] + '</p>';
                if (typeof config.image !== 'undefined') {
                    tmpl += '<img src="' + row[config.image] + '"></img>';
                }
                tmpl += "</div>";

                var action = L.marker([row.lat, row.long]).actions.addRemove(map);

                this._generateSlide(actions, i + 1, tmpl, action);
            }

            this.story.go(this.seq.current());
        },

        changeSlide: function (n) {
            this.seq.current(n);
        }
    });
}
new OdysseyGenerator();  //init generator