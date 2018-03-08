require('dotenv').config();
var MongoClient	= require('mongodb').MongoClient
var MongoURL		= process.env.MONGO_URL
var fs = require('fs');
var ObjectId    = require('mongodb').ObjectID
var gcloud = require('google-cloud') ({
  projectId: process.env.GCLOUD_PROJECT,
  keyFilename: '../google-secret.json'
})

var gcs= gcloud.storage ({
  projectId: process.env.GCLOUD_PROJECT,
  keyFilename: 'google-secret.json'
})


var create = function ( req, res ) {
  if (!req.body.title || !req.body.description || !req.body.startdate || !req.body.enddate)
    return res.json({ success: false, message: 'Insufficient information', body: req.body })

  MongoClient.connect(MongoURL, function(err, db) {
    if (err)
      return res.json({ success: false, message: 'Error connecting to database' })
    var flyers = db.collection('flyers')


    if (!req.body.image_url && req.file) {
      var bucket = gcs.bucket('bulletinstorage');
      bucket.upload(req.file.path, function(err, file) {
        if (err) {
          res.send({ success: false, message: "Error uploading: " + err })
          return;
          //res.send({ success: true, message: "Image uploaded", image_url:  'http://storage.googleapis.com/bulletin/' + req.file.filename })
        }
        else {
          // TODO: Delete Temp images after upload
          var flyer = {
            title: req.body.title,
            description: req.body.description,
      			flags: 0,
            //image_url: req.body.image_url,
            image_url: 'http://storage.googleapis.com/bulletinstorage/' + req.file.filename,
            owner: req.decoded.email
          }

          flyers.insert(flyer, function(err, result) {
            flyerid = result.ops[0];

            if (err)
              return res.json({ success: false, message: 'Error sending data to database'})
            return res.json({ success: true, message: 'Created new flyer', flyer: flyerid})
          })
        }
      })
    } else {
      var flyer = {
        title: req.body.title,
        description: req.body.description,
        startdate: req.body.startdate,
        enddate: req.body.enddate,
        flags: 0,
        image_url: req.body.image_url,
        //image_url: 'http://storage.googleapis.com/bulletin/' + req.file.filename,
        owner: req.decoded.email
      }

      flyers.insert(flyer, function(err, result) {
        flyerid = result.ops[0];

        if (err)
          return res.json({ success: false, message: 'Error sending data to database'})
        return res.json({ success: true, message: 'Created new flyer', flyer: flyerid})
      })
    }
  })
}

var flag = function ( req, res ) {
  // TODO: Fix duplicate flags from same user error! (Crashes server)
  if (!req.body.flyer)
    return res.json({ success: false, message: 'Insufficient information' })

  MongoClient.connect(MongoURL, function(err, db) {
    if (err)
      return res.json({ success: false, message: 'Error connecting to database' })
    var flyers = db.collection('flyers')

    flyers.findOne( {_id : new ObjectId(req.body.flyer)}, function(err, result) {
      if (err)
        return res.json({ success: false, message: 'Error finding flyer in database'})

      if (result.owner == req.decoded.email) {
        flyers.remove({_id : new ObjectId(req.body.flyer)})
        return res.json({ success: true, message: 'Deleted own flyer' })
      }

      if (result.flags == 4) {
        flyers.remove({_id : new ObjectId(req.body.flyer)})
        return res.json({ success: true, message: 'Flagged flyer and deleted' })
      } else {
        flyers.update({_id : new ObjectId(req.body.flyer)}, {$set:{'flags' : parseInt(result.flags) + 1}, $push:{'users_flagged': req.decoded.email }})
        return res.json({ success: true, message: 'Flagged flyer' })  }
    })
  })
	//return res.json({ success: true, message: "test" })
}

var collect = function ( req, res ) {
  if (!req.body.flyer)
    return res.json({ success: false, message: 'Insufficient information' })

  MongoClient.connect(MongoURL, function(err, db) {
    if (err)
      return res.json({ success: false, message: 'Error connecting to database' })
    var flyers = db.collection('users')

    flyers.findOne( {email : req.decoded.email}, function(err, result) {
      if (err)
        return res.json({ success: false, message: 'Error finding user in database'})

        if (result.collected.indexOf(req.body.flyer) == -1) {
          flyers.update({email : req.decoded.email}, {$addToSet:{'collected' : req.body.flyer}})
          return res.json({ success: true, message: 'Collected flyer' })
        } else {
          flyers.update({email : req.decoded.email}, {$pull:{'collected' : req.body.flyer}})
          return res.json({ success: true, message: 'Removed collected flyer' })
        }
    })
  })
	//return res.json({ success: true, message: "test" })
}

var getuser = function ( req, res ) {
  if (!req.body.email)
    return res.json({ success: false, message: 'Insufficient information' })

    MongoClient.connect(MongoURL, function(err, db) {
      if (err)
				return res.json({ success: false, message: 'Error connecting to database' })
      var flyers = db.collection('users')

      //console.log(req.body.flyer)

      flyers.find( { email : req.body.email}).toArray(function(err, result) {
        if (err)
          return res.json({ success: false, message: 'Error finding flyer in database'})

          console.log(result)

        return res.json({result})
      })
    })

}

var getinfo = function ( req, res ) {
  if (!req.body.flyer)
    return res.json({ success: false, message: 'Insufficient information' })

    MongoClient.connect(MongoURL, function(err, db) {
      if (err)
				return res.json({ success: false, message: 'Error connecting to database' })
      var flyers = db.collection('flyers')

      //console.log(req.body.flyer)

      flyers.find( {_id : new ObjectId(req.body.flyer)}).toArray(function(err, result) {
        if (err)
          return res.json({ success: false, message: 'Error finding flyer in database'})

        console.log(result)
        return res.json({result})
      })
    })

}

var getflyers = function ( req, res ) {
  //if (!req.body.start || !req.body.end)  WE WILL NEED THIS WHEN WE ADD FILTERS : TO KNOW
  //  return res.json({ success: false, message: 'Insufficient information' })  var startdate = new Date()
  var date = new Date()

  var year = date.getFullYear();
  var month = (1 + date.getMonth()).toString();
  month = month.length > 1 ? month : '0' + month;
  var day = date.getDate().toString();
  day = day.length > 1 ? day : '0' + day;

  var startdate = new Date(month + '/' + day + '/' + year).getTime();;
  var enddate = new Date(month + '/' + day + '/' + year + 1).getTime();
  var owner;
  if (req.body.startdate) {
    startdate = new Date(req.body.startdate).getTime()
  }
  if (req.body.enddate) {
    enddate = new Date(req.body.enddate).getTime()
  }

  MongoClient.connect(MongoURL, function(err, db) {
    if (err)
      return res.json({ success: false, message: 'Error connecting to database' })
    var users = db.collection('users')
    users.findOne({ email: req.decoded.email }, function (err, userresult) {
      if (err) {
        return res.json({ success: false, message: 'Error connecting to database' })
      }
      if (req.body.collected == 'true') {
        var flyers = db.collection('flyers')
        var collectedId = []
        for (var item in userresult.collected) {
          collectedId.push(new ObjectId(userresult.collected[item]))
        }
        flyers.find({"_id" : { $in : collectedId } ,startdate: {"$gte": startdate}, enddate: {"$lte": enddate}, users_flagged: {$nin: [req.decoded.email]}}).toArray(function (err, result) {
          if (err)
            return res.json({ success: false, message: 'Error finding flyers in database'})

            return res.json({success: true , flyers:result, collected: userresult.collected, currentuser: req.decoded.email})
        })
      } else {
        var flyers = db.collection('flyers')
        flyers.find({startdate: {"$gte": startdate}, enddate: {"$lte": enddate}, users_flagged: {$nin: [req.decoded.email]}}).toArray(function (err, result) {
          if (err)
            return res.json({ success: false, message: 'Error finding flyers in database'})

            return res.json({success: true , flyers:result, collected: userresult.collected, currentuser: req.decoded.email})
        })
      }
    })
  })
}

var functions = {
  create: create,
  flag: flag,
  getinfo: getinfo,
  getflyers: getflyers,
  collect: collect,
  getuser: getuser
}

module.exports = functions
