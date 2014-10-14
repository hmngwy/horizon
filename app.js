var express             = require('express'),
    session             = require('express-session'),
    bodyParser          = require('body-parser'),
    Chance              = require('chance'),
    Recaptcha           = require('recaptcha').Recaptcha,
    restful             = require('node-restful'),
    mongoose            = require('mongoose'),
    materializedPlugin  = require('mongoose-materialized'),
    _                   = require('underscore');

// RECAPTCHA CONFIG
var PUBLIC_KEY  = process.env.RECAPTCHA_KEY || '6LdS2_sSAAAAAMLZbnArIERAhwutv0KaQIP6lAWs',
    PRIVATE_KEY = process.env.RECAPTCHA_KEY_PRIVATE || '6LdS2_sSAAAAAAOgKurCsZRyJ2RPhKBf1alCxwRn';

// EXPRESS SETUP
var app = express();
app.use(bodyParser());
app.use(express.query());
app.use(session({
  secret: 'phrasing'
}));

app.use('/', express.static(__dirname + '/static/'));
app.get('/', function(req, res) {
    res.sendfile(__dirname + '/static/client.html');
});
app.get('/sesh', function(req, res) {
    res.json(req.session);
});

// MONGOOSE SCHEMA SETUP
mongoose.connect( (process.env.NODE_ENV=='development') ? "mongodb://localhost/tree3" : process.env.MONGOLAB_URI );

var PostSchema = mongoose.Schema({
    body: { type: String, index: false },
    user: { type: String, index: false },
    created: { type: Date, default: Date.now },
    meta: { type: Object, index: false },
    responses: {type:Number, default: 0}
});

PostSchema.pre('save', function(next){

    if(this.parentId!=undefined)
        if(this.parentId=='')
            delete this.parentId; //foolproof nerf if empty string

    next();
});
PostSchema.post('save', function(doc){

    if(doc.parentId)
        Post.count({parentId:doc.parentId}, function(err, count){ //get nodes under this parentID
            Post.findOne({_id:doc.parentId}, function(err, post){ //get the parent node
                if(post)
                {
                    post.responses = count; //write the number of nodes under it
                    post.save();
                }
            });
        });

});

PostSchema.plugin(materializedPlugin);

var Post = mongoose.model('post', PostSchema);

// REST RESOURCE SETUP
var Resource = app.resource = restful.model('post', PostSchema).methods(['get','post']);

Resource.route('roots', function(req, res, next) {
    Post.find({path:""}).sort({created:-1}).lean().exec(function(err, post){
        res.send(JSON.stringify(post));
    });
});

Resource.route('immediate', {
    detail: true,
    handler: function(req, res, next) {
        Post.find({parentId:req.params.id}).lean().exec(function(err, docs){
            res.send(JSON.stringify(docs));
        });
    }
});
Resource.route('tree', {
    detail: true,
    handler: function(req, res, next) {
        Post.findOne({_id:req.params.id}, function(err, post){
            post.getTree({ sort: { created: -1 } }, function(err,docs){
                res.send(JSON.stringify(docs));
            });
        });
    }
});
Resource.route('children', {
    detail: true,
    handler: function(req, res, next) {
        Post.findOne({_id:req.params.id}, function(err, post){
            post.getChildren({ sort: { created: -1 } }, function(err,docs){
                res.send(JSON.stringify(docs));
            });
        });
    }
});
Resource.route('siblings', {
    detail: true,
    handler: function(req, res, next) {
        Post.findOne({_id:req.params.id}, function(err, post){
            post.getSiblings({ sort: { created: -1 } }, function(err,docs){
                res.send(JSON.stringify(docs));
            });
        });
    }
});
Resource.route('ancestors', {
    detail: true,
    handler: function(req, res, next) {
        Post.findOne({_id:req.params.id}, function(err, post){
            post.getAncestors({ sort: { created: -1 } }, function(err,docs){
                res.send(JSON.stringify(docs));
            });
        });
    }
});

Resource.before('post', function(req, res, next){

    delete req.body.user;
    delete req.body.created;
    delete req.body.meta;
    delete req.body.responses;

    if(req.body.body.trim() == ''){
        console.log(req.body.body.trim() == '');
        res.status(400);
        res.json({
            status: 'failed',
            reason: 'empty'
        });
        res.end();
    }else{
        var data = {
            remoteip:  req.connection.remoteAddress,
            challenge: req.body.recaptcha_challenge_field,
            response:  req.body.recaptcha_response_field
        };
        var recaptcha = new Recaptcha(PUBLIC_KEY, PRIVATE_KEY, data);

        if(req.body.parentId)
        {
            var chance = new Chance();
            req.session.usernames = req.session.usernames || {};
            //we're restricing it to the node level
            //because we don't check for uniqueness enough to use on the global level
            req.session.usernames[req.body.parentId] = req.session.usernames[req.body.parentId] || chance.string({length:7, pool: 'aaaaeeeeiiiioooouuuuyyyybcdfghjklmnpqrstvwxz'});
            req.session.save();
            req.body.user = req.session.usernames[req.body.parentId];
        }

        recaptcha.verify(function(success, error_code) {
            if (success) {
                next(); //valid, forwards we go
            } else {
                res.status(400);
                res.json({
                    status: 'failed',
                    reason: 'bad-captcha'
                });
            }
        });
    }

});

// RUN APP
Resource.register(app, '/n');
app.listen(process.env.PORT);
