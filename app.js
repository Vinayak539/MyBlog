
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy=require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const _ =require("lodash");
const https=require('https');
var uuid = require('uuid-random');
var fs = require('fs'); 
var path = require('path'); 
var multer = require('multer'); 
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

  

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



/////////////////////////  date ///////////////////////////////////////////////////////////////////
var today = new Date();
         var dd = String(today.getDate()).padStart(2, '0');
         var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
         var yyyy = today.getFullYear();
         var time=today.getHours() + ":" + today.getMinutes()

        today = dd + '/' + mm + '/' + yyyy + "" +"-"+ "" + time;


//mongoose connection 
const mongoURI='mongodb://localhost:27017/blogs';

const conn = mongoose.connect(mongoURI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

//creating the schema
const userSchema = new mongoose.Schema({
  
 username:{
   type: String,
   requied: true,
   unique: true,
   minlength:12,
   maxlength:25
},
 password:{
   type: String,
   requied: true,
   minlength:8,
   maxlength:12
},

 googleId:String,
 facebookId:String,
 blog:[Object],
 profile:{
  uname:{
    type:String,
    default:"user",
    unique: true,
    maxlength:20
  },
  insta:{
    type:String,
     unique: true,
    default:""
  },
  fb:{
    type:String,
     unique: true,
    default:""
  } 
 }
});  

//Schema plugins
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//new mongoose collection(model)
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/MyBlog",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID,
    clientSecret: process.env.FB_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/myblog",
    userProfileURL: "https://www.facebookapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


///////////////////////////////////// GridFs Storage code in this section /////////////////////////////////////////////

// let gfs;

// conn.once('open', () => {
//   // Init stream
//   gfs = Grid(conn.db, mongoose.mongo);
//   gfs.collection('User');
// });

// // Create storage engine
// const storage = new GridFsStorage({
//   url: mongoURI,
//   file: (req, file) => {
//     return new Promise((resolve, reject) => {
//       crypto.randomBytes(16, (err, buf) => {
//         if (err) {
//           return reject(err);
//         }
//         const filename = buf.toString('hex') + path.extname(file.originalname);
//         const fileInfo = {
//           filename: filename,
//           bucketName: 'User' // Should match the collection name
//         };
//         resolve(fileInfo);
//       });
//     });
//   }
// });
// const upload = multer({ storage });




//////////////////////////////////////////////////////////////////////// get requests //////////////////////////////////////////////////////////////////////



app.get("/",function(req,res){
  res.render("home");
})



app.get("/settings",function(req,res){
  if(req.isAuthenticated()){
        var count=0;
     User.findById({_id:req.user._id},function(err,found){
      for(var i=0; i<found.blog.length; i++){
        count=count+1;
      }
      if(!err){
         res.render("settings", {name:_.upperCase(found.profile.uname),found:found,count:count });
      }
    })
      
}else{
    res.redirect("/login");
  }
     
})

app.get("/help",function(req,res){
  res.render("help");
})


app.get("/about_us",function(req,res){
  res.render("about_us");
})



app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/MyBlog",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/");
  });


app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/myblog',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });


app.get("/login",function(req,res){

	res.render("login");
})


app.get("/signup",function(req,res){
	res.render("signup");
})

app.get("/display",function(req,res){
	 User.find({ blog: { $exists: true, $ne: [] }, profile:{ $exists: true, $ne: [] } }, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
      	 
        res.render("display", {usersWithMessage : foundUsers});
      }
    }
  });

	
})

app.get("/submit",function(req,res){
	if (req.isAuthenticated()){
    User.findById({_id:req.user._id},function(err,found){
      if(!err){
        res.render("submit",{name:_.upperCase(found.profile.uname)});
      }
    })
    
  } else {
    res.redirect("/login");
  }
})



app.get("/logout",function(req,res){
	req.logout();
  res.redirect("/");
	
})

app.get("/warning",function(req,res){
    res.render("warning");
})

app.get("/warning_blog_delete",function(req,res){
  res.render("warning_blog_delete");
})

////////////////////////////////////// post requests ///////////////////////////////////////////////////////////////////

app.post("/submit",function(req,res){
    
	User.findOne({_id: req.user._id},function(err,found){
		if(!err){

			if(found){

				found.blog.push({
					title:req.body.title,
					message:req.body.message,
					date:today,
          blog_id:uuid() ,
          likes:0,
          dislikes:0
				});


		        found.save(function(err){
		        	if(!err){
		        		res.redirect("/display");
		        	}else{
		        		console.log(err);
		        	}
		
	              });
		    }
		}
  
})
})


app.post("/signup",function(req,res){

	User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.render("faliure",{faliure:err} );
    } else {
      passport.authenticate("local")(req, res, function(){
           res.redirect("/");
      });
    }
});
});



app.post('/login',function(req,res){

	const user=new User({
		username:req.body.username,
		password:req.body.password
	})

	req.login(user,function(err){
		if(!err){
			passport.authenticate("local")(req, res, function(){
			res.redirect("/");
     
		})
			
		}else{
			console.log(err);
			res.redirect("/login");
		}
	})

});


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/posts/:parameter",function(req,res){
 
  const requestedTitle= _.upperCase(req.params.parameter);
  User.find(function(err,posts){
    for(var i=0;i<posts.length;i++){

      for(var j=0; j<posts[i].blog.length; j++){
        const storedTitle= _.upperCase(posts[i].blog[j].title);
        const storedContent= posts[i].blog[j].message;
        const date=posts[i].blog[j].date;
        

     if( storedTitle== requestedTitle )
     {
      var fb=posts[i].profile.fb;
      var insta=posts[i].profile.insta;
      var name=_.upperCase(posts[i].profile.uname);
      var imageURL= "data:posts[i].profile./<%=posts[i].profile.image.contentType%>;base64, <%=posts[i].profile.image.data.toString('base64')%>";

      res.render("disp_anchor",{getTitle:storedTitle, getContent:storedContent, getdate:date , fb:fb,insta:insta, name:name,imageURL:imageURL});
      }
   }
      
  }
})

})


/////////////////////////////////////////// Settings(Update & Delete + profile+ MyBlogs) /////////////////////////////////////////////////////////////////


app.post("/settings/update",function(req,res){
  
    var a=req.user._id;
  User.updateOne({_id:a},{$set:req.body},{overwrite:false,upsert:true,new:true}, function(err){
    if(!err){
        res.render("success",{success:"Successfully Updated Record!!!"})
    }else{
      res.render("faliure",{faliure:err});
    }
  })
  

})



app.post("/settings/profile" ,function(req,res){

 User.findByIdAndUpdate({_id: req.user._id},{$set:{profile:req.body}},{overwrite:false,useFindAndModify:false},function(err){ 
      if(!err){
        res.render("success",{success:"Your profile is set/updated successfully !!! "})
      }
  }); 

})


app.get("/settings/delete",function(req,res){

      var b=req.user._id;
  User.findByIdAndDelete({_id:b},function(err){
    if(!err){
        res.render("success",{success:"Successfully Deleted Record!!!"});
    }else{
      res.render("faliure",{faliure:err});
    }
  })
  
})


app.get("/settings/my_blogs",function(req,res){
  User.findById({_id: req.user._id},function(err,found){
    if(!err){
      if(found.blog){
         var myblog=found.blog;
         res.render("my_blogs" ,{getBlog:myblog});
      }else if(found.blog===""){
        res.render("faliure",{faliure:"You have not posted any blogs yet"});
      }
    }else{
      console.log(err);
    }
  })
})




app.post("/settings/myblog/delete",function(req,res){

	User.findById({_id:req.user._id},function(err,found){

   found.blog=found.blog.filter(function(item){
    return item.blog_id!==req.body.blog_id;
   });
      
      found.save(function(err){
        if(!err){
          res.redirect("/settings/my_blogs");
        }else{
          res.render("faliure",{faliure:"Not able to delete your blog"});
        }
      });
 })   
})

app.post("/settings/myblog/update",function(req,res){

User.findById({_id:req.user._id},function(err,found){
  if(!err){
   found.blog.forEach(function(x){
    if(x.blog_id===req.body.blog_id){
      var title=_.lowerCase(x.title);
      var message=x.message;
      res.render("submit_update",{title:title, message:message, id:x.blog_id, today:today});
    }
   })
  }
 })

})


app.post("/settings/myblog/update/final",function(req,res){

 User.findById({_id:req.user._id},function(err,found){
  if(!err){
    //var x="";
    found.blog.forEach(function(x){
    if(x.blog_id===req.body.blog_id){
      //x=req.body;

  /*User.updateOne({_id:req.user._id},{$set:{ x:req.body}},function(err){
  if(!err){
    res.redirect("/settings/my_blogs");
  }else{
          res.render("faliure",{faliure:err})
        }
 })*/
         x.title=req.body.title;
         x.message=req.body.message;

         found.save(function(err){
        if(!err){
          res.redirect("/settings/my_blogs");
        }else{
          res.render("faliure",{faliure:err})
        }
      });
          
    }
    });

    }
 })
})



///////////////////////////////////////////////////////////// server port /////////////////////////////////////////////////////////////////////////////////// 

app.listen(3000, function(){
	console.log("server up and running on port 3000");
})
