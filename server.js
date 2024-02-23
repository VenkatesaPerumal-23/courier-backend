const express = require("express");
const path = require("path");
const cors = require("cors");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const { request } = require("http");
const dbPath = path.join(__dirname, "courier.db");
const app = express();

app.use(cors());
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.get("/", (req, res) => {
        res.send("Hello, this is your Express server!");
      });
    app.listen(3001, () => {
      console.log("Server Running at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer(); 


const authenticateUserToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

const authenticateAdminToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//User Login API
app.post("/user/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = password===dbUser.password;
      if (isPasswordMatched === true) {
        const payload = {
          username: username,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
});
  
// Get particular package id
app.get("/user/:id/", authenticateUserToken, async (request, response) => {
  const { id } = request.params;
  const getTrackingQuery = `
    SELECT 
      *
    FROM 
      packages 
    WHERE 
      id = ${id};`;
  const track = await db.get(getTrackingQuery);
  response.send(track);
});

//Admin Login API
app.post("/admin/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectAdminQuery = `SELECT * FROM admin WHERE username = '${username}'`;
  const dbUser = await db.get(selectAdminQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = password===dbUser.password;
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
}); 

app.get("/admin/packages/",authenticateAdminToken,async(request,response)=>{
  const packageQuery = `SELECT * FROM packages ORDER BY id ASC;`; 
  const dbData = await db.all(packageQuery) ;
  response.send(dbData);
});

app.post("/admin/add/",authenticateAdminToken,async(request,response)=>{
   const { id,status,location } = request.body;
   const createPackageQuery = `INSERT INTO packages(id,status,location) VALUES (
    ${id},'${status}','${location}'
   );`; 
   db.run(createPackageQuery); 
   response.send("Successfully created New Package");
}); 

app.put("/admin/:id/",authenticateAdminToken,async(request,response)=>{
  const {id} = request.params; 
  const {status,location} = request.body; 
  const updatePackageQuery = `UPDATE packages SET 
  status = '${status}',location = '${location}' WHERE id = ${id};`;
  await db.run(updatePackageQuery);
  response.send("Updated Package Status");
}); 

app.delete("/admin/:id/",authenticateAdminToken,async(request,response)=>{
  const { id } = request.params; 
  const DeletePackageQuery = `DELETE from packages
  WHERE id = ${id};`; 
  await db.run(DeletePackageQuery); 
  response.send("Deleted Package") ;
});