var express = require("express");
var server = express();
var http = require("http").createServer(server);
var router = express.Router();
var cors = require("cors");
var bodyParser = require("body-parser");
var filesystem = require("fs");
var io = require("socket.io")(http);
const { v4: uuidv4 } = require("uuid");
const { MongoClient, ServerApiVersion } = require("mongodb");
var model = require("./model.js");
var user = {};
var socketuser = {};
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(cors());

const uri =
  "mongodb+srv://gowtham:gowtham2000@cluster11.fl290tz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster11";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("user").command({ ping: 1 });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    // client.close()
  } catch {
    console.log("error occured");
  }
}
run().catch(console.dir);

router.get("/getresume", (req, res) => {
  res.download("./Gowtham's Resume (3).pdf");
});

router.get("/", (req, res) => {
  var obj = {};
  obj.responseType = "S";
  obj.responseBody = "Server running";
  obj.message = "";
  res.status(200).send(obj);
});
router.get("/user", (req, res) => {
  filesystem.readFile("./user.json", (err, data) => {
    if (data.toString().length == 0) {
      var obj = {};
      obj.responseType = "F";
      obj.responseBody = "No data found";
      obj.message = "No data found";
      res.status(400).send(obj);
    } else {
      var obj = {};
      obj.responseType = "S";
      obj.responseBody = eval("(" + data.toString() + ")");
      obj.message = "";
      res.status(200).send(obj);
    }
  });
});
router.post("/register", async (req, res) => {
  const client = new MongoClient(uri);
  const dbo = client.db("user");
  const collection = dbo.collection("user_details");
  const userdata = { ...req.body.body };

  const exist = await collection
    .find({
      name: userdata.name,
      email: userdata.email,
      mobile: userdata.mobile,
    })
    .toArray();

  if (exist.length == 0) {
    await collection.insertOne({ ...req.body.body });
    var obj = {};
    obj.responseType = "S";
    obj.responseBody = "Registerd successfully";
    obj.message = "New record insert successfully";
    res.status(200).send(obj);
  } else {
    var obj = {};
    obj.responseType = "F";
    obj.responseBody = "User already exis";
    obj.message = "User number already exist";
    res.status(200).send(obj);
  }
});
router.post("/chat", (req, res) => {
  var body = req.body;
  filesystem.access("comman.file", filesystem.F_OK, (err) => {
    if (err) {
      var obj = {};
      obj.responseType = "F";
      obj.responseBody = "No data found";
      obj.message = "No data found";
      res.status(400).send(obj);
      return;
    }
    filesystem.readFile("./comman.file", (err, data) => {
      if (data.toString().length == 0) {
        var obj = {};
        obj.responseType = "F";
        obj.responseBody = "No data found";
        obj.message = "No data found";
        res.status(400).send(obj);
      } else {
        var list = JSON.parse(data.toString());
        console.log("list ----", list, body);
        var filter = list.filter(
          (item) => item.to == body.to || item.to == body.from
        );
        var obj = {};
        obj.responseType = "S";
        obj.responseBody = filter;
        obj.message = "";
        res.status(200).send(obj);
      }
    });
  });
});
router.post("/login", async (req, res) => {
  // console.log("login",req.body.body)
  var body = req.body.body;
  const client = new MongoClient(uri);
  const dbo = client.db("user");
  const collection = dbo.collection("user_details");
  const data = await collection.find({ name: "gowtham" }).toArray();
  console.log("user fetched  -- " + data.length);
  if (data.length == 0) {
    var obj = {};
    obj.responseType = "F";
    obj.responseBody = "No record found";
    obj.message = "No record found";
    res.status(400).send(obj);
  } else {
    var userlist = [...data];
    var usr = userlist.filter(
      (item) => item.email == body.email && item.password == body.password
    );
    if (usr.length != 0) {
      var m = uuidv4();
      usr[0].token = m;
      user[m] = {};
      user[m].user = usr[0];
      var obj = {};
      obj.responseType = "S";
      obj.responseBody = usr[0];
      obj.message = "Logged in successFully";
      res.status(200).send(obj);
    } else {
      var obj = {};
      obj.responseType = "F";
      obj.responseBody = "wrong password";
      obj.message = "wrong password";
      res.status(200).send(obj);
    }
  }
});

io.on("connection", (socket) => {
  socket.on("adduser", (user) => {
    if (socketuser[user] == undefined) {
      socketuser[user] = socket;
      socket.username = user;
      var arr = [];
      Object.keys(socketuser).forEach((ele) => {
        if (arr.indexOf(ele) == -1) {
          arr.push(ele);
        }
      });
      setTimeout(() => {
        io.emit("sendUser", arr);
      }, 300);
    }
  });
  socket.on("sendmessage", (obj) => {
    console.log(obj);
    filesystem.access("comman.file", filesystem.F_OK, (err) => {
      if (err) {
        console.error(err);
        var list = [];
        list.push(obj);
        filesystem.writeFile(
          "comman.file",
          JSON.stringify(list),
          "utf-8",
          (err, success) => {}
        );
        return;
      }
      filesystem.readFile("comman.file", (err, data) => {
        var list = JSON.parse(data.toString());
        list.push(obj);
        filesystem.writeFile(
          "comman.file",
          JSON.stringify(list),
          "utf-8",
          (err, success) => {}
        );
      });

      //file exists
    });
    socketuser[obj.to].emit("message", obj);
  });
  socket.on("disconnect", () => {
    var email = socket.username;
    if (socketuser[email] != undefined) {
      io.emit("removeuser", email);
      delete socketuser[email];
    }
  });
});

http.listen(4000);
