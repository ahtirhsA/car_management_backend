const express=require('express')
const multer = require('multer');
const cors = require('cors');
const Joi=require('joi')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const app=express()
app.use(cors({ origin: 'http://localhost:3000' }));


const upload = multer({ dest: 'uploads/' });  


app.use(express.json())
app.use('/uploads', express.static('uploads'));


const {open}=require('sqlite')
const sqlite3=require('sqlite3')

const path=require('path')
const dbpath=path.join(__dirname,'cars.db')

let db;

const PORT=3004


const formDataValidation=Joi.object({
    carName:Joi.string().required(),
    description:Joi.string().required(),
    userIdentity:Joi.string().required(),
    
})



const initializeConnection=async ()=>{

    try{
    db=await open(
        {
            filename:dbpath,
            driver:sqlite3.Database
        }
    )
    app.listen(PORT,()=>{
        console.log(`Server is running at http://localhost:${PORT}`)
    })

}catch(e){
        console.log(`The Error Message is ${e}`)
    }

}

initializeConnection()

app.get('/',(req,res)=>{
    res.send("Hello")
})

app.post('/',async (request,response)=>{
    const {id,mailId,pswrd,name,mblNum}=request.body 
 
    const hashedpassword=await bcrypt.hash(pswrd,10);
 
    const checkDb=`
      SELECT * FROM regUsers WHERE email='${mailId}';
    `
 
    const resCheck=await db.get(checkDb);
 
    if (resCheck===undefined){
 
       const insertQuery=`
         INSERT INTO regUsers(id,email,password,name,phone)VALUES('${id}','${mailId}','${hashedpassword}','${name}','${mblNum}');
       `
       await db.run(insertQuery);
       response.send('ok');
 
    }
    else{
       response.send('not ok')
    }
 })
 
 
 app.post('/login',async (request,response)=>{
 
    const {mailId1,pswrd1}=request.body
 
    const query=`
     SELECT * FROM regUsers WHERE email='${mailId1}';
    `
 
    const runLoginQuery=await db.get(query)
 
    if (runLoginQuery!==undefined){
 
       const cmppswd=await bcrypt.compare(pswrd1,runLoginQuery.password)
 
       if (cmppswd){
 
          const payload={
             userMail:mailId1
          }
 
          const jwtToken=jwt.sign(payload,'ASHRITHA')
 
          response.send({jwtToken,userLoginName:runLoginQuery.name,userIdt:runLoginQuery.id})
       }
       else{
          response.status(401)
          response.send('not ok1')
       }
 
    }
    else{
       response.status(404)
       response.send('not ok2')
    }
 
 
 })
 
 const middleWear=(request,response,next)=>{
 
    const authHead=request.headers['authorization'];
    let jwt_token;
     
    if (authHead!==undefined){
       jwt_token=authHead.split(' ')[1]
 
       if (jwt_token!==undefined){
          jwt.verify(jwt_token,'ASHRITHA',(error,payload)=>{
             if (error){
                response.status(404)
                response.send('Invalid Jwt')
             }
             else{
                next()
             }
          })
       }
       else{
          response.status(404)
          response.send('Jwt not defined')
       }
    }else{
       response.status(404)
       response.send('Authorization header not provided')
    }
    
 }


 app.put('/detailsupdate/:userIdtn',middleWear,async (request,response)=>{

    const {userIdtn}=request.params
     
    const {updName,updEmail,updPswd,updPhone}=request.body 
 
    const newUpdPswd=await bcrypt.hash(updPswd,10);
 
    const updtQuery=`
       UPDATE regUsers 
       SET email='${updEmail}',
       password='${newUpdPswd}',
       name='${updName}',
       phone='${updPhone}'
       WHERE id='${userIdtn}';
    `
 
 
   try{
    const result1=await db.run(updtQuery)
    console.log(result1)
    response.send('updated')
   }
   catch (error) {
    console.error('Error updating task status:', error);
    response.status(500).send({ message: 'Internal server error' });
 }
    
 })
 
 // GET USER
 
 app.get('/profileInfo/:pid',middleWear,async (request,response)=>{
 
   const {pid}=request.params
 
   const profileQuery=`
      SELECT * FROM regUsers WHERE id='${pid}';
   `
 
   const runQuery=await db.get(profileQuery)
 
   response.send(runQuery)
 })
 
 // DELETE USER
 
 app.delete('/delUser/:delId',middleWear,async (request,response)=>{
    const {delId}=request.params

    const fetchCarId=`
       SELECT id from cars WHERE userId=?;
    `
    try{
     let delCarIds=await db.all(fetchCarId,delId)

     delCarIds=delCarIds.map((i)=>i.id)

    

    const delQuery=`
     DELETE FROM regUsers WHERE id=?;
    `
    const p=await db.run(delQuery,delId)

    

    const carDelete=`
       DELETE FROM cars WHERE userId=?;
    `

     await db.run(carDelete,delId)

 

    for (let i of delCarIds){
       const delCarImages= `
         DELETE FROM car_images WHERE car_id=?;
        `
        await db.run(delCarImages,i)
    }


     response.status(200).send("deleted")
    }
    catch (error) {
        response.status(500).json({message:'Error while deleting user'});
     }
 })
 


//GET PRODUCTS

app.get('/products/:id',middleWear,async (req,res)=>{

    const {id}=req.params

    const {search}=req.query

    const getCars=`
       SELECT id,car_name,thumbnail FROM cars 
       WHERE userId=? AND LOWER(car_name) LIKE '%${search}%';
    `

    try{
      const carArr=await db.all(getCars,id)
      res.status(200).json({ data:carArr});
    }
    catch(error){
        console.error('Error inserting data:', error);
        res.status(500).json({error: 'Failed to insert data into the database'});
    }
})

// PRODUCT DETAILS

app.get('/details/:id',middleWear,async (req,res)=>{

    const {id}=req.params

    const frstQuery=`
       SELECT * FROM cars WHERE id=${id};
    `

    try{

    const resFrstQuery=await db.get(frstQuery)

    const scndQuery=`
       SELECT * FROM car_images WHERE car_id=${id}
    `

    const resScndQuery=await db.all(scndQuery)

    res.status(200).json({...resFrstQuery,similarImages:resScndQuery});

    }catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ error: 'Failed to insert data into the database' });
    }


})


// CREATE PRODUCTS

app.post('/upload-images',middleWear,upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'images', maxCount: 10 }]),async (req,res)=>{


    const { error } = formDataValidation.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {carName,description,userIdentity} = req.body


    if (!req.files['thumbnail'] || !req.files['images'] || req.files['images'].length === 0) {
        return res.status(400).json({ error: 'Thumbnail and images are required' });
    }

    const thumbnail = req.files['thumbnail'][0];  
    const images = req.files['images'] ;

    const thumbnailUrl = `http://localhost:3004/uploads/${thumbnail.filename}`;


    const insertCars=`
       INSERT INTO cars(car_name,car_desc,thumbnail,userId)
       VALUES(?,?,?,?)
    `

    try{

    const insrtCarRes=await db.run(insertCars,[carName,description,thumbnailUrl,userIdentity])

    console.log(insrtCarRes)

    const carId = insrtCarRes.lastID; 


    
   const imageUrls = images.map((file) => {
        return `http://localhost:3004/uploads/${file.filename}`;
      });

    for (const url of imageUrls) {
        await db.run(
          `INSERT INTO car_images(car_id,image) VALUES(?,?)`,[carId,url]
        );
    }

    res.status(200).json({ message: 'Car and images uploaded successfully!' });

}catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: 'Failed to insert data into the database' });
}
})


//UPDATE PRODUCTS

app.put('/update/:id',middleWear,upload.fields([{ name: 'updImg', maxCount: 1 }, { name: 'updImages', maxCount: 10 }]),async (req,res)=>{

  //  console.log(req.files)

    const {id}=req.params

    const { error } = formDataValidation.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {carName,description,userIdentity} = req.body

    if (!req.files['updImg'] || !req.files['updImages'] || req.files['updImages'].length === 0) {
        return res.status(400).json({ error: 'Thumbnail and images are required' });
    }

    const updImg = req.files['updImg'][0];
    const updImages = req.files['updImages'];

    const thumbnailUrl1 = `http://localhost:3004/uploads/${updImg.filename}`;




    const updCars=`
       UPDATE cars SET 
       car_name=?,
       car_desc=?,
       thumbnail=?,
       userId=?
       WHERE id=?
    `


    try{

        const p=await db.run(updCars,[carName,description,thumbnailUrl1,userIdentity,id])

        console.log(p)

        const imageUrls1 = updImages.map((file) => {
            return `http://localhost:3004/uploads/${file.filename}`;
          });


        const delQuery=`
           DELETE FROM car_images WHERE car_id=?;
        `

        await db.run(delQuery,id)
    
        for (const url1 of imageUrls1) {
            await db.run(
              `INSERT INTO car_images(car_id,image) VALUES(?,?)`,[id,url1]
            );
        }

        res.status(200).json({message:'Car and images updated successfully!'});
    }
    catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({error:'Failed to insert data into the database'});
    }

})

//DELETE PRODUCT

app.delete('/delete/:id',middleWear,async (req,res)=>{

    const {id}=req.params

    const deleteCarQuery=`
      DELETE FROM cars WHERE id=?
    `

    try{

    await db.run(deleteCarQuery,id)

    const delCarImages=`
      DELETE FROM car_images WHERE car_id=?
    `

    await db.run(delCarImages,id)

    res.status(200).json({message:'Car deleted successfully'});


    } 
    catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({error:'Failed to insert data into the database'});
    }

})