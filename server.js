import app from "./src/app.js";
import connectToDB from "./src/config/db.js";


connectToDB()

app.listen(3006,()=>{
    console.log("server is running on port 3006")
})