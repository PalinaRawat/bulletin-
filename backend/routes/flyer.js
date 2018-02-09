var MongoClient	= require('mongodb').MongoClient
var MongoURL		= 'mongodb://admin:password@ds227168.mlab.com:27168/bulletin'

var create = function ( req, res ) {
  if (!req.body.title || !req.body.description || !req.body.startdate || !req.body.enddate)
    return res.json({ success: false, message: 'Insufficient information' })

  MongoClient.connect(MongoURL, function(err, db) {
    var flyers = db.collection('flyers')

    var flyer = {
      title: req.body.title,
      description: req.body.description,
      startdate: req.body.startdate,
      enddate: req.body.enddate,
      owner: req.decoded.email
    }

    flyers.insert(flyer, function(err, result) {
      if (err)
        return res.json({ success: false, message: 'Error sending data to database'})
      return res.json({ success: true, message: 'Created new flyer' })
    })
  })
}

var flag = function ( req, res ) {
  if (!req.body.flyer)
    return res.json({ success: false, message: 'Insufficient information' })

    MongoClient.connect(MongoURL, function(err, db) {
      var flyers = db.collection('flyers')

      flyers.findOne( {_id: req.body.flyer}, function(err, result) {
        if (err)
          return res.json({ success: false, message: 'Error finding flyer in database'})

        if (result.owner == req.decoded.email) {
          flyers.remove({ "_id" : req.body.flyer })
          return res.json({ success: true, message: 'Deleted own flyer' })
        }

        if (result.flags == 4) {
          flyers.remove({ "_id" : req.body.flyer })
          return res.json({ success: true, message: 'Flagged flyer and deleted' })
        } else {
          flyers.update({ "_id" : req.body.flyer}, {$set:{'flags' : result.flags + 1}})
          return res.json({ success: true, message: 'Flagged flyer' })
        }
      })
    })

	return res.json({ success: true, message: "test" })
}

var getinfo = function ( req, res ) {
  if (!req.body.flyer)
    return res.json({ success: false, message: 'Insufficient information' })

    MongoClient.connect(MongoURL, function(err, db) {
      var flyers = db.collection('flyers')

      flyers.findOne( {_id: req.body.flyer}, function(err, result) {
        if (err)
          return res.json({ success: false, message: 'Error finding flyer in database'})


        return res.json({ title: result.title, description: result.description, startdate: result.stardate, enddate: result.enddate, image_url: result.image_url, owner: result.owner })
      })
    })

}

var getflyers = function ( req, res ) {
  //if (!req.body.start || !req.body.end)  WE WILL NEED THIS WHEN WE ADD FILTERS : TO KNOW
  //  return res.json({ success: false, message: 'Insufficient information' })

  MongoClient.connect(MongoURL, function(err, db) {
    var flyers = db.collection('flyers')

    flyers.find({}).toArray(function(err, result) {
      if (err)
        return res.json({ success: false, message: 'Error finding flyers in database'})


      return res.json({flyers: result})
    })
  })
}

var functions = {
  create: create,
  flag: flag,
  getinfo: getinfo,
  getflyers: getflyers
}

module.exports = functions
