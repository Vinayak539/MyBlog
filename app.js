
//jshint esversion:6
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


//// date //////
var today = new Date();
         var dd = String(today.getDate()).padStart(2, '0');
         var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
         var yyyy = today.getFullYear();
        // var time=today.getHours() + ":" + today.getMinutes()

        today = dd + '/' + mm + '/' + yyyy

///var temp set global var (weather API)
var temp="";
var city="";
var feels_like="";
var humidity="";

//mongoose connection 
mongoose.connect('mongodb://localhost:27017/MyBlogs', {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

//creating the schema
const userSchema = new mongoose.Schema({
  
 username:String,
 password:String,
 googleId:String,
 facebookId:String,
 blog:[Object],
 profile:Object
});  

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


//////////////////////////////////////////////////////////////////////// get requests //////////////////////////////////////////////////////////////////////



app.get("/",function(req,res){
  res.render("home");
  //,{temp:temp, city:city, feels_like:feels_like, humidity:humidity }
})



app.get("/settings",function(req,res){
  if(req.isAuthenticated()){
    res.render("settings");
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

/*app.get("/profile",function(req,res){
  if(req.isAuthenticated()){
    res.render("profile");
  }else{
    res.redirect("/login");
  }
})*/

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
    res.render("submit");
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

//////////////////////////////////////////////////////////////////////////////////// post requests //////////////////////////////////////////////////////////


/*app.post("/",function(req,res){
 cityname=req.body.cityname;

  https.get("https://api.openweathermap.org/data/2.5/weather?q="+ cityname +"&appid=process.env.WEATHER_API&units=metric",function(response){
          response.on("data",function(data){
            const a=JSON.parse(data);
            console.log(a);
            temp=a.main.temp;
            city=a.name;
            feels_like=a.main.feels_like;
            humidity=a.main.humidity;
            
            //var icon=a.weather[0].icon;
           // var imgUrl="http://api.openweathermap.org/img/wn/"+icon+"@2x.png";

            res.render("home",{temp:temp, city:city, feels_like:feels_like, humidity:humidity });
        })
          
   })
  
})*/

app.post("/submit",function(req,res){
    
	User.findOne({_id: req.user._id},function(err,found){
		if(!err){

			if(found){

				found.blog.push({
					title:req.body.title,
					message:req.body.message,
					date:today,
          blog_id:uuid() 
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

/*var user= new User({
   fullname:req.body.fullname,
    username:req.body.username,
    password:req.body.password
});

user.save(function(err){
  if(!err){
    res.redirect("/");
  }else{
    res.render("faliure",{faliure:err});
  }
});*/

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
      res.render("disp_anchor",{getTitle:storedTitle, getContent:storedContent, getdate:date , fb:fb,insta:insta, name:name});
      }
   }
      
  }
})

})







/*app.post("/posts/:parameter",function(req,res){
 
  const requestedTitle= _.upperCase(req.params.parameter);
  User.find(function(err,posts){
    for(var i=0;i<posts.length;i++){

      for(var j=0; j<posts[i].blog.length; j++){
        const storedTitle= _.upperCase(posts[i].blog[j].title);
        const storedContent= posts[i].blog[j].message;
        const date=posts[i].blog[j].date;
        

     if( storedTitle== requestedTitle )
     {
      var fb=req.body.fb;
      var insta=req.body.insta;
      var name=_.upperCase(req.body.uname);
      res.render("disp_anchor",{getTitle:storedTitle, getContent:storedContent, getdate:date , fb:fb,insta:insta, name:name});
      }
   }
      
  }
})

})*/


//////////////////////////////////////////////////////////// Settings(Update & Delete + profile+ MyBlogs) /////////////////////////////////////////////////////////////////


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


app.post("/settings/profile",function(req,res){

/*var updateQuery = {};

if(req.body.name==="" && req.body.DOB===""){
    updateQuery={
    additional_info:req.body.additional_info
  };
}
else if(req.body.DOB==="" && req.body.additional_info===""){
   updateQuery={
    name:req.body.name
  };
}
else if(req.body.name==="" && req.body.additional_info===""){
    updateQuery={
    DOB:req.body.DOB
  };
}
else if(req.body.name===""){
  updateQuery={
    DOB:req.body.DOB,
    additional_info:req.body.additional_info
  };
}
else if(req.body.DOB===""){
  updateQuery={
    name:req.body.name,
    additional_info:req.body.additional_info
  };
}
else if(req.body.additional_info===""){
  updateQuery={
    name:req.body.name,
    DOB:req.body.DOB
  };
}
else{
  updateQuery=req.body;
}*/

/*for(key of req.body) {
  //this would be a function to validate what can be updated
    if (req.body.hasOwnProperty(key) && canBeModified(key)){ 
        updateQuery['body.' + key] = req.body[key] };
}*/
//db.users.update({}, {$set: updateQuery}, cb);


 /*User.findByIdAndUpdate({_id: req.user._id},{$set:{profile:updateQuery}},{overwrite:false},function(err){ 
      if(!err){
        res.render("success",{success:"Your profile is set/updated successfully !!! "})
      }
  }); */



 User.findByIdAndUpdate({_id: req.user._id},{$set:{profile:req.body}},{overwrite:false},function(err){ 
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
      }else{
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
      var title=x.title;
      var message=_.lowerCase(x.message);
      res.render("submit_update",{title:title, message:message, id:x.blog_id, today:today});
    }
   })
  }
 })

})


app.post("/settings/myblog/update/final",function(req,res){

 User.findById({_id:req.user._id},function(err,found){
  if(!err){
    found.blog.forEach(function(x){
    if(x.blog_id===req.body.blog_id){
      x=req.body;
    }
    
     });

     
   found.save(function(err){
        if(!err){
          res.redirect("/settings/my_blogs");
        }else{
          res.render("faliure",{faliure:err})
        }
      })

  
  }
 })
})



///////////////////////////////////////////////////////////// server port /////////////////////////////////////////////////////////////////////////////////// 

app.listen( 3000, function(){
	console.log("server up and running on port 3000 you can now perform your activities server is always ready to help you !!!");
})
