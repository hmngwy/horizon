define([
  'underscore',
  'backbone',
  'jquery',
  'moment'
], function(_, Backbone, $, moment) {

    var base_refresh_time = 8000;
    var refresh_time = base_refresh_time;


    var get_media = function(text)
    {
        var media_markup = media_type = target = '';
        uris = text.match(window.uri_pattern);
        if(uris)
        {
            var target = uris[0];

            var youtube_pattern = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
            var match_youtube_url = target.match(youtube_pattern);

            if (target.match(/\.(jpeg|jpg|gif|png)$/) != null) //if image url
            {
                media_markup = '<a href="'+target+'" target="_blank"><img src="'+target+'"></a>';
                media_type = "image";
            }else if(match_youtube_url&&match_youtube_url[7].length==11){ //if youtube URL
                media_markup = '<a href="'+target+'" target="_blank" style="background-image: url(http://img.youtube.com/vi/'+match_youtube_url[7]+'/0.jpg);"></a>';
                media_type = "youtube";
            }

            if(target!='')
                var transformed_text = text.replace(target, '<a href="'+target+'" class="media_link" target="_blank">'+target+'</a>');
        }

        return {
            type: media_type,
            markup: media_markup,
            target: target,
            text: transformed_text || text
        };
    }

    var Post = Backbone.Model.extend({
        url: '/n/',
        initialize: function(){
        }
    });
    var PostCollection = Backbone.Collection.extend({
        model: Post,
        initialize: function(models, options){
            this.parent = options.parent;
        },
        url: function(){
            if(this.parent!=undefined && this.parent!='root')
                return '/n/'+this.parent+'/immediate';
            else
                return '/n/roots';
        }
    });

    var ColumnView = Backbone.View.extend({
        el: '.columns',
        render: function (options) {
            var options = options || {};
            options.id = options.id || 'root';
            var that = this;
            var posts = new PostCollection([], {parent:options.id});
            posts.fetch({
                success: function(docs) {

                    console.log('loaded : '+options.id);

                    if(docs.models.length!=0)
                    {
                        // depth hack
                        var depth = docs.models[0].get('path').split(",").length;
                    }else{
                        var deepest = parseInt($('[data-node="'+options.id+'"]').parents('[data-level]').attr('data-depth'));
                        var depth = (deepest + 1) || 0;
                    }



                    //MAYBE MOVE THIS TO ROUTER AND PASS EL TO VIEW INSTANCIATION
                    //set up column
                    var columnMarkup = _.template($('[type="underscore/template"][name="level"]').html(),
                        {id: options.id||'root', depth: depth});

                    if($('.columns').find('[data-level="'+options.id+'"]').length==0) //if this node isn't on the frontend
                    {
                        console.log('inserting because '+options.id);

                        var i = 1;

                        while($('[data-depth="'+i+'"]').length!=0) i++;

                        if($('[data-depth]').length==0) $('.columns').append( columnMarkup ); //if empty
                        else {
                            console.log($('[data-depth="'+(i-1)+'"]'));
                            $(columnMarkup).insertAfter('[data-depth="'+(i-1)+'"]');
                        }

                    }

                    //MOVE UP TO HERE
                    var columnEl = $('[data-depth="'+depth+'"]');
                    columnEl = $('[data-depth="'+depth+'"]').attr('data-level', options.id);


                    var added = 0;
                    //column contents
                    _.each(docs.models, function(doc, i){

                        media = get_media(doc.get('body'));
                        doc.set('body', media.text)

                        if(columnEl.find('ul').find('[data-node="'+doc.get('_id')+'"]').length==0) //if node not in front-end
                        {
                            doc.set('created_formatted', moment(doc.get('created')).format('MM-D-YYYY h:mm a'));
                            doc.set('created_int', moment(doc.get('created')).unix());
                            var nodeMarkup = _.template($('[type="underscore/template"][name="node"]').html(), {
                                post: doc,
                                media_markup: (depth>1) ? media.markup : '',
                                media_type: media.type,
                                media_url: media.target
                            });
                            if(options.id=='root')
                            {
                                if(columnEl.find('[data-level="'+options.id+'"] li').length==0) columnEl.find('ul').append( nodeMarkup );
                                else{
                                    $(nodeMarkup).insertAfter('[data-node="'+docs.models[i-1].get('_id')+'"]');
                                    console.log('[data-node="'+docs.models[i-1].get('_id')+'"]');
                                }
                            }
                            else
                                columnEl.find('ul').append( nodeMarkup ); //inserting each node item
                            // console.log(columnEl.find('ul'));
                            added++;
                        }

                    });



                    // console.log('end open');

                    if(options.callback)
                        options.callback(added);


                    depth++;
                    while($('[data-depth="'+(depth)+'"]').length!=0)
                    {
                        $('[data-depth="'+(depth)+'"]').remove();
                        depth++;
                    }
                    //set form parent id
                    $('[data-userinput-postform-parent]').val($('[data-level]').last().attr('data-level'));

                }
            });
        },
        events: {
            'click [data-level="root"] [data-node]': 'open',
            'click [data-level] [data-node-childrencount]': 'open',
            'click [data-level] [data-node-time]': 'open'
        },
        user_reference: function(el)
        {
            user = ($(el.target).attr('data-node-user') || $(el.target).parents('[data-node-user]').attr('data-node-user'));
            console.log(user);
        },
        open: function(el)
        {
            active_absolute_path = ($(el.target).attr('data-node-absolute-path') || $(el.target).parents('[data-node]').attr('data-node-absolute-path')).replace(/^,/, '');
            location.hash = "#/p/"+ active_absolute_path;
            console.log('eiii');

            // var id = $(el.target).attr('data-node') || $(el.target).parents('[data-node]').attr('data-node');

            // this.render(id);
        }
    });

    var columns = {};
    var refresh;

    var AppRouter = Backbone.Router.extend({
      routes: {

          "": "getRoots",
          //"x/:id": "getPost",
          //"p/": "getPath",
          "p/:path": "getPath",

          //,"*actions": "defaultRoute" // Backbone will try match the route above first
      }
    });
    // Instantiate the router
    var app_router = new AppRouter;
    app_router.on('route:getRoots', function (id) {
        console.log('get roots');
        columns['root'] = new ColumnView();
        columns['root'].render({callback: function(added){ autorefresh(added) }});
    });
    // app_router.on('route:getPost', function (id) {
    //     console.log('get post');
    //     column = new ColumnView();
    //     column.render({id:id, callback: function(added){ autorefresh(added) }});
    // });
    app_router.on('route:getPath', function (path) {

        refresh_time = base_refresh_time;

        if(path)
            var levels = path.split(",");
        //for each level, check if already loaded, if not load one after the other

        //but check root first
        if($('[data-level="root"]').length==0)
        {
            columns['root'] = new ColumnView();
            columns['root'].render({});
        }

        //now loop through levels
        if(levels)
        {
            _.each(levels, function(level, i){
                if($('[data-level="'+level+'"]').length==0)
                {
                    columns[level] = new ColumnView();
                    options = {id:level}
                    if(i == levels.length-1)
                        options.callback = function(){
                            autorefresh($('[data-level="'+level+'"]').length);
                        }

                    columns[level].render(options);
                }
                $('[data-node="'+level+'"]').addClass('active').siblings().removeClass('active');
            });
        }


        //now remove all existing levels not in the :path
        $('[data-level]').each(function(){
            if(($(this).attr('data-level')!='root'))
                if( levels.indexOf($(this).attr('data-level'))==-1 )
                    $(this).remove();
        });

        $('[data-userinput-postform-parent]').val($('[data-level]').last().attr('data-level'));

    });
    // app_router.on('route:defaultRoute', function (actions) {
    //     alert( actions );
    // });
    // Start Backbone history a necessary step for bookmarkable URL's
    Backbone.history.start();

    $(document).ready(function(){
        $(document).on('click', '[data-node-user-button]', function(){
            var contents = $('[data-userinput-postform-body]').val();
            $('[data-userinput-postform-body]').val(
                contents + ((contents[contents.length-1]==' '||contents.length==0) ? '' : ' ') + '@' + $(this).attr('data-node-user')
            );
            console.log($(this).attr('data-node-user'));
        });
        $('[data-node-close]').click(function(){
            window.history.back();
        });
        var submit = function(){
            var payload = {
                body: $('[data-userinput-postform-body]').val(),
                recaptcha_response_field: $('[data-userinput-postform-captcha]').val(),
                recaptcha_challenge_field: $('[name="recaptcha_challenge_field"]').val()
            };
            if($('[data-userinput-postform-parent]').val()!='' && $('[data-userinput-postform-parent]').val()!='root')
                payload.parentId = $('[data-userinput-postform-parent]').val();

            $.post('/n', payload).done(function(){
                console.log('posted');
                $('[data-userinput-postform-body]').val('');
                $('[data-userinput-postform-captcha]').val('');


            }).fail(function(){
                console.log('erred');
            }).always(function(){
                Recaptcha.reload();

                column = new ColumnView();
                column.render({id:payload.parentId});
            });
        }
        $('[data-userinput-postform-captcha]').keyup(function(e){
            var code = (e.keyCode ? e.keyCode : e.which);
            if(code == 13) { //Enter keycode
                submit();
            }
        });
        $('[data-userinput-postform-body]').keyup(function(e){
            media = get_media($('[data-userinput-postform-body]').val());
            $('[data-media-preview]').html(media.markup).attr('data-media-preview', media.type);

        });
        $('[data-userinput-postform-submit]').click(submit);
    });


    var autorefresh = function(added){
        if(added == 0) refresh_time = (refresh_time<30000) ? refresh_time+4000 : 30000;
        else if(added < 5) refresh_time = base_refresh_time * .75;
        else if(added < 10) refresh_time = base_refresh_time * .5;
        console.log("reloading in : " + refresh_time + 'ms');
        refresh = setTimeout(function(){
            clearTimeout(refresh);
            var last = $('[data-level]').last().attr('data-level');
            console.log('refreshing : '+last);
            columns[last].render({id:last, callback: function(added){
                autorefresh(added);
            }});
        }, refresh_time);
    }

});
