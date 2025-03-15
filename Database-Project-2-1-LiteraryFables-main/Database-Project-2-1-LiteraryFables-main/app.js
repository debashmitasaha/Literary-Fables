const express = require('express')
//const ejsLint = require('ejs-lint');
const app = express()

const db = require('oracledb')
db.outFormat = db.OUT_FORMAT_OBJECT

app.set('view engine','ejs')
app.use(express.static('public'))


app.listen(9000)
app.use(express.urlencoded({
   extended : true 
}))

let id;
//let user_id;
let shopID;

app.get('/about', (req,res) => {
    db.getConnection(
        {
            username: "c##Trial",
            password: "trial",
            connectString: "localhost:1521/ORCLCDB"
        }, async (err,conn) => {
            if(err){
                console.log('connection failed')
            }else{
                const bookdata = await conn.execute('SELECT * FROM BUYABLE_BOOKS')
                console.log(bookdata.rows[1].RATING)
                const arr = [1,2,3,4,5]
                const bookarray = bookdata.rows

                const bookshopdata = await conn.execute('SELECT * FROM BOOKSHOP')
                const bookshoparray = bookshopdata.rows
                res.render('index.ejs',{arr,bookarray,bookshoparray})
            }
        }
    )         
})

app.get('/home', (req,res) => {
    res.render('homepage.ejs')
})

app.get('/bookshoplogin',(req,res) => {
    res.render('bookshoplogin.ejs')
})

app.post('/bookshoplogin', (req,res) => {
    //console.log(req.body.SHOP_ID)
    //console.log(req.body.PASSWORD)

    let name = req.body.NAME.toUpperCase();
    let password = req.body.PASSWORD

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                console.log('connection established')
                const q = 'select shop_id from bookshop where name = :name';
                const d = await conn.execute(q,[name])
                console.log(name)
                console.log(d.rows)
                id = d.rows[0].SHOP_ID;

                const query = 'select * from bookshop where shop_id = :id'

                const shopdata = await conn.execute(query,[id])
                const shoparray = shopdata.rows;
                
                if(shoparray.length == 0) res.render('invalidpassid.ejs')
                else {
                    if(password != shoparray[0].PASSWORD) res.render('invalidpassid.ejs')

                    else{
                        const query1 = 'select P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES from buyable_shop_books B JOIN PUBLISHED_BOOKS P ON (B.published_book_id = P.book_id) where shop_id = :id'
                        const bookdata = await conn.execute(query1,[id])
                        const bookarray = bookdata.rows
                        const query2 = 'select sum(price) as total_amount from purchase where shop_id = :id group by shop_id'
                        const data = await conn.execute(query2,[id])
                        let total_amount;
                        if(data.rows.length == 0){
                            total_amount = 0
                        }else total_amount = data.rows[0].TOTAL_AMOUNT
                        let s_id = id
                        
                        res.render('ShopPageAfterLogin.ejs',{shoparray,bookarray,total_amount,s_id})
                    }
                }
            }
        }
    )
})

app.get('/buyablebooks',(req,res) => {
    
})



app.get('/addbook', (req,res) => {
    res.render('addbook.ejs',{id})
})

app.post('/addbook', (req,res) => {
    let isbn = req.body.ISBN
    let name = req.body.NAME
    let genre = req.body.GENRE
    let price = req.body.PRICE;
    let locked = req.body.LOCKED;
    let number_of_copies = req.body.NUMBER_OF_COPIES;
    let author_id = req.body.AUTHOR_ID;
    let current_no_readers = 0;

    let shop_id = req.body.SHOP_ID;
    

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let qq = 'SELECT MAX(BOOK_ID) AS LATEST_ID FROM BUYABLE_BOOKS';
                let dd = await conn.execute(qq);
                let book_id = dd.rows[0].LATEST_ID + 1;

                let query = 'INSERT INTO BUYABLE_BOOKS(BOOK_ID,ISBN,SHOP_ID,NAME,GENRE,LOCKED,PRICE,NUMBER_OF_COPIES,CURRENT_NO_READERS,AUTHOR_ID) VALUES(:book_id,:isbn,:shop_id,:name,:genre,:locked,:price,:number_of_copies,:current_no_copies,:author_id)'

                try{
                    let data = await conn.execute(query,[book_id,isbn,shop_id,name,genre,locked,price,number_of_copies,current_no_readers,author_id])
                    conn.commit()
                    book_id++;
                }catch(e){
                    console.log(book_id);
                    console.log('book already exists')
                }

                const q = 'SELECT * FROM BOOKSHOP WHERE SHOP_ID= :shop_id'
                const d = await conn.execute(q,[shop_id])
                const arr = d.rows;

                const previous_no_books = arr[0].TOTAL_NUMBER_OF_BOOKS;
                const new_no_books = previous_no_books + Number(number_of_copies)

                const q1 = 'UPDATE BOOKSHOP SET TOTAL_NUMBER_OF_BOOKS = :new_no_books WHERE SHOP_ID = :shop_id'
                const d1 = await conn.execute(q1,[new_no_books,shop_id])
                conn.commit();
                
                const query1 = 'select * from bookshop where shop_id = :id'

                const shopdata = await conn.execute(query1,[id])
                const shoparray = shopdata.rows;

                const query2 = 'select * from buyable_books where shop_id = :id'
                const bookdata = await conn.execute(query2,[id])
                const bookarray = bookdata.rows
                res.render('ShopPageAfterLogin.ejs',{shoparray,bookarray})
                
            }
        }
    )
})


app.get('/updatebook', (req,res) => {
    res.render('updatebook.ejs')
})

app.post('/updatebook', (req,res) => {
    let isbn = req.body.ISBN;
    let price = req.body.PRICE;

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err) 
            else{
                let q = 'SELECT * FROM BUYABLE_BOOKS WHERE ISBN = :isbn'
                const bdata = await conn.execute(q,[isbn])
                const array = bdata.rows
                
                if(array.length == 0) res.render('invalidisbn.ejs')
                else{
                    let query = 'UPDATE BUYABLE_BOOKS SET PRICE= :price WHERE ISBN = :isbn'
                    const data = await conn.execute(query,[price,isbn])
                    conn.commit()

                    const query1 = 'select * from bookshop where shop_id = :id'

                    const shopdata = await conn.execute(query1,[id])
                    const shoparray = shopdata.rows;

                    const query2 = 'select * from buyable_books where shop_id = :id'
                    const bookdata = await conn.execute(query2,[id])
                    const bookarray = bookdata.rows
                    res.render('ShopPageAfterLogin.ejs',{shoparray,bookarray})
                }

            }
        }
    )
})


app.get('/addmorecopies', (req,res) => {
    res.render('addmorebooks.ejs',{id})
})

app.post('/addmorecopies', (req,res) => {
    let isbn = req.body.ISBN;
    let copies_added = req.body.COPIES_ADDED;
    let shop_id = req.body.SHOP_ID;

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let query = 'SELECT * FROM BUYABLE_BOOKS WHERE ISBN = :isbn AND SHOP_ID = :shop_id'
                let data = await conn.execute(query,[isbn,shop_id])
                const bookarray1 = data.rows;

                if(bookarray1.length == 0) console.log('BOOK DOES NOT EXIST')
                else{
                    let previous_copies = bookarray1[0].NUMBER_OF_COPIES;
                    let new_copies = previous_copies + Number(copies_added);

                    let query1 = 'UPDATE BUYABLE_BOOKS SET NUMBER_OF_COPIES = :new_copies WHERE ISBN = :isbn AND SHOP_ID = :shop_id'
                    const data1 = await conn.execute(query1,[new_copies,isbn,shop_id])
                    conn.commit();

                    const q = 'SELECT * FROM BOOKSHOP WHERE SHOP_ID= :shop_id'
                    const d = await conn.execute(q,[shop_id])
                    const arr = d.rows;

                    const previous_no_books = arr[0].TOTAL_NUMBER_OF_BOOKS;
                    const new_no_books = previous_no_books + Number(copies_added)

                    const q1 = 'UPDATE BOOKSHOP SET TOTAL_NUMBER_OF_BOOKS = :new_no_books WHERE SHOP_ID = :shop_id'
                    const d1 = await conn.execute(q1,[new_no_books,shop_id])
                    conn.commit();
                

                    const query3 = 'select * from bookshop where shop_id = :id'

                    const shopdata = await conn.execute(query3,[id])
                    const shoparray = shopdata.rows; 

                    const query2 = 'select * from buyable_books where shop_id = :id'
                    const bookdata = await conn.execute(query2,[id])
                    const bookarray = bookdata.rows
                    res.render('ShopPageAfterLogin.ejs',{shoparray,bookarray})
                }
            }
        }
    )
})

app.get("/bookshopsignup", (req, res) => {
    res.render('bookShopSignUpform.ejs');
});

app.get('/demofirst',(req,res)=>{
    res.render('first.ejs')
})

app.get('/secondpage',(req,res) => {
    res.render('secondpage.ejs')
})

app.post('/bookshopsignup', (req, res) => {

    let name = req.body.NAME;
    let password = req.body.PASSWORD;
    let total_books = 0, total_sold_books = 0;

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err);
            else {
                let qq = 'SELECT MAX(SHOP_ID) AS LATEST_ID FROM BOOKSHOP';
                let dd = await conn.execute(qq);
                let shop_id = dd.rows[0].LATEST_ID + 1;

                let query = 'INSERT INTO BOOKSHOP(SHOP_ID,NAME,TOTAL_NUMBER_OF_BOOKS,TOTAL_NUMBER_OF_SOLD_BOOKS,PASSWORD) VALUES(:shop_id,:name,:password,:total_books,:total_sold_books,:password)';
                try {
                    let d = await conn.execute(query, [shop_id, name, total_books, total_sold_books, password]);
                    conn.commit();
                    shop_id++;
                } catch (e) {
                    console.log(shop_id);
                    console.log('BOOKSHOP ALREADY EXISTS');
                }

                res.render('bookshoplogin.ejs');
            }
        }
    )
});



app.get('/userlogin', (req, res) => {
    res.render('userlogin.ejs');
});

app.post('/userlogin', (req, res) => {
    console.log(req.body.EMAIL);
    console.log(req.body.PASSWORD);

    let email = req.body.EMAIL;
    let password = req.body.PASSWORD;

    db.getConnection(
        {
            user: 'c##Trial',
            password: 'trial',
            connectionString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) {
                console.log(err);
            } else {
                console.log('connection established');

                const query = 'SELECT * FROM CUSTOMER WHERE EMAIL= :email'
                const userdata = await conn.execute(query, [email]);
                const userarray = userdata.rows;
                let user_id = userarray[0].USER_ID

                if (userarray.length == 0) {
                    res.render('invaliduserlogin.ejs');
                } else {
                    if (password != userarray[0].PASSWORD) res.render('invaliduserlogin.ejs');

                    else {
                        const query1 = 'SELECT * FROM BOOKSHOP';
                        const bookshopdata = await conn.execute(query1);
                        const bookshoparray = bookshopdata.rows;

                        const query3 = 'SELECT * FROM LIBRARY';
                        const librarydata = await conn.execute(query3)
                        const libraryarray = librarydata.rows;

                        const q3 = 'UPDATE CUSTOMER SET USAGE_DAYS = SYSDATE - SIGN_UP_DATE WHERE USER_ID = :user_id'
                        const d3 = await conn.execute(q3,[user_id])
                        conn.commit()

                        const q4 = 'SELECT COUNT(*) AS LC FROM BORROW WHERE LATE_FEE <> 0 AND RETURN_TIME IS NULL AND USER_ID = :user_id'
                        const d4 = await conn.execute(q4,[user_id])
                        let overdue_books = d4.rows[0].LC;

                        let c = 1;

                        const query2 = 'select sum(price) as total_amount from purchase where user_id = :user_id group by user_id'
                        const data1 = await conn.execute(query2,[user_id])
                        let total_amount;
                        if(data1.rows.length == 0){
                            total_amount = 0
                        }
                        else total_amount = data1.rows[0].TOTAL_AMOUNT

                        let qb = "SELECT SUM(NUMBER_OF_COPIES) AS CNT FROM BORROW WHERE USER_ID = :user_id AND TRUNC(START_TIME,'DAY') = TRUNC(SYSDATE,'DAY')"
                        let d = await conn.execute(qb,[user_id])
                        let cnt = d.rows[0].CNT

                        let qq = 'SELECT BORROW_NUM_LIMIT FROM LIBRARY_CARD WHERE USER_ID = :user_id'
                        let dd = await conn.execute(qq,[user_id])
                        let max;
                        if(dd.rows.length == 0)
                            max = 0
                        else max = dd.rows[0].BORROW_NUM_LIMIT


                        let qe = "SELECT COUNT(*) AS ECNT FROM EXCHANGE WHERE USER_ID = :user_id AND TRUNC(EXCHANGE_DATE,'DAY') = TRUNC(SYSDATE,'DAY')"
                        let de = await conn.execute(qe,[user_id])
                        let ecnt = de.rows[0].ECNT

                        let qe1 = 'SELECT EXCHANGE_LIMIT FROM CUSTOMER WHERE USER_ID = :user_id'
                        let de1 = await conn.execute(qe1,[user_id])
                        let emax = de1.rows[0].EXCHANGE_LIMIT;


                        res.render('UserPageAfterLogin.ejs', { total_amount,bookshoparray,user_id,libraryarray,overdue_books,c, cnt,max,ecnt,emax });
                    }
                }
            }
        }
    );
});

app.get("/showallbooks/:user_id", (req, res) => {
    let user_id = req.params.user_id;
    db.getConnection(
        {
            user: 'c##Trial',
            password: 'trial',
            connectionString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) {
                console.log(err);
            } else {
                console.log('connection established');
                //Advanced Query
                let q1 = 'SELECT P.NAME AS BOOK_NAME, B.START_TIME AS START_TIME, LC.BORROW_DAY_LIMIT AS DAY_LIMIT, L.NAME AS LIBRARY_NAME FROM BORROW B JOIN BORROWABLE_LIBRARY_BOOKS LB ON (B.BOOK_ID = LB.LIBRARY_BOOK_ID) JOIN PUBLISHED_BOOKS P ON (LB.PUBLISHED_BOOK_ID = P.BOOK_ID) JOIN LIBRARY L ON (LB.LIBRARY_ID = L.LIBRARY_ID) JOIN LIBRARY_CARD LC ON (B.CARD_ID = LC.CARD_ID) WHERE B.USER_ID = :user_id'
                let d1 = await conn.execute(q1,[user_id])
                let borrowedbooks = d1.rows;
                res.render("/showallbooks.ejs",{borrowedbooks});
            }
        }
    );

});

app.post('/userpageafterlogin', (req,res) => {
    let shop_id = req.body.SHOP_ID;
    let user_id = req.body.USER_ID;
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let query = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_ID = :shop_id'
                let data = await conn.execute(query,[shop_id])
                let bookarray1 = data.rows
                shopID = shop_id

                /*let query1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BORROWABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_ID = :shop_id'
                let data1 = await conn.execute(query1,[shop_id])
                let bookarray2 = data1.rows*/
                let cannot_add_to_more_shops = false;
                let not_enough_copies = false;
                
                res.render('booksinshop.ejs',{user_id,bookarray1,cannot_add_to_more_shops,not_enough_copies})
            }
        }
    )
})

app.post("/userpageafterlogin1",(req,res) => {
    let library_id = req.body.LIBRARY_ID
    let user_id = req.body.USER_ID
    
    db.getConnection(
    {
        username: 'c##Trial',
        password: 'trial',
        connectString: 'localhost:1521/ORCLCDB' 
    }, async (err,conn) =>{
        if(err) console.log(err)
        else{
            //let q1 = 'SELECT * FROM MEMBERSHIP_APPLICATION WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
            let q1 = 'SELECT IS_MEMBER(USER_ID,LIBRARY_ID) AS IS_MEM FROM MEMBERSHIP_APPLICATION WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
            let d1 = await conn.execute(q1,[user_id,library_id])
            let is_member;
            if(d1.rows.length != 0 && d1.rows[0].IS_MEM == "YES") is_member = true;
            else is_member = false;

            let q2 = 'SELECT B.LIBRARY_ID AS LIBRARY_ID, B.LIBRARY_BOOK_ID AS BOOK_ID, B.STATUS AS STATUS, P.NAME AS NAME, P.GENRE AS GENRE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES FROM BORROWABLE_LIBRARY_BOOKS B JOIN PUBLISHED_BOOKS P ON B.PUBLISHED_BOOK_ID = P.BOOK_ID WHERE B.LIBRARY_ID = :library_id'
            let d2 = await conn.execute(q2,[library_id])
            let qb = "SELECT SUM(NUMBER_OF_COPIES) AS CNT FROM BORROW WHERE USER_ID = :user_id AND TRUNC(START_TIME,'DAY') = TRUNC(SYSDATE,'DAY')"
            let d = await conn.execute(qb,[user_id])
            let cnt = d.rows[0].CNT

            let qq = 'SELECT BORROW_NUM_LIMIT FROM LIBRARY_CARD WHERE USER_ID = :user_id'
            let dd = await conn.execute(qq,[user_id])
            let max = dd.rows[0].BORROW_NUM_LIMIT


            let librarybooks = d2.rows;
            let borrowconfirmed = false;
            let card_upgraded = false;
            res.render('booksinlibrary.ejs',{is_member,librarybooks,user_id,library_id,max,cnt,borrowconfirmed,card_upgraded})
        }
    })
})

app.get("/userSignUpform", (req, res) => {
    res.render('userSignUpform.ejs');
});


app.post('/userSignUpform', (req, res) => {

    let name = req.body.NAME;
    let password = req.body.PASSWORD;
    let email = req.body.EMAIL;

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err);
            else {
                let qq ='SELECT MAX(USER_ID) AS LATEST_ID FROM CUSTOMER' ;
                let dd = await conn.execute(qq);
                let user_id = dd.rows[0].LATEST_ID +1 ;

                let exchange_lim = 5;

                let query = 'INSERT INTO CUSTOMER(USER_ID,NAME,PASSWORD,EMAIL,EXCHANGE_LIMIT) VALUES(:user_id,:name,:password,:email,:exchange_lim)';
                try {
                    let d = await conn.execute(query, [user_id, name, password, email, exchange_lim]);
                    conn.commit();
                    user_id++;
                } catch (e) {
                    console.log(user_id);
                    console.log('USER ALREADY EXISTS');
                }

                let q = 'SELECT MAX(SUBSCRIPTION_ID) AS LAT_ID FROM SUBSCRIPTION'
                let d = await conn.execute(q);
                let new_id = d.rows[0].LAT_ID + 1;
                let type = 'FREE'
                
                let q1 = 'INSERT INTO SUBSCRIPTION(SUBSCRIPTION_ID,USER_ID,SUBSCRIPTION_TYPE,START_TIME) VALUES(:new_id,:user_id,:type,SYSDATE)'
                let d1 = await conn.execute(q1,[new_id,user_id,type])
                conn.commit()

                res.render('userlogin.ejs');
            }
        }
    )
});


app.get('/userpageafterlogin/:user_id', (req,res) => {
    let user_id = req.params.user_id;
    console.log(user_id);
    console.log(typeof(user_id));
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                const query1 = 'SELECT * FROM BOOKSHOP';
                const bookshopdata = await conn.execute(query1);
                const bookshoparray = bookshopdata.rows;

                const query3 = 'SELECT * FROM LIBRARY';
                const librarydata = await conn.execute(query3)
                const libraryarray = librarydata.rows;


                const query2 = 'select sum(price) as total_amount from purchase where user_id = :user_id group by user_id'
                const data1 = await conn.execute(query2,[user_id])
                let total_amount;
                if(data1.rows.length == 0){
                    total_amount = 0
                }
                else total_amount = data1.rows[0].TOTAL_AMOUNT 

                let overdue_books = 0;
                let c = 0;

                let qb = "SELECT SUM(NUMBER_OF_COPIES) AS CNT FROM BORROW WHERE USER_ID = :user_id AND TRUNC(START_TIME,'DAY') = TRUNC(SYSDATE,'DAY')"
                        let d = await conn.execute(qb,[user_id])
                        let cnt = d.rows[0].CNT

                        let qq = 'SELECT BORROW_NUM_LIMIT FROM LIBRARY_CARD WHERE USER_ID = :user_id'
                        let dd = await conn.execute(qq,[user_id])
                        let max = dd.rows[0].BORROW_NUM_LIMIT

                let qe = "SELECT COUNT(*) AS ECNT FROM EXCHANGE WHERE USER_ID = :user_id AND TRUNC(EXCHANGE_DATE,'DAY') = TRUNC(SYSDATE,'DAY')"
                let de = await conn.execute(qe,[user_id])
                let ecnt = de.rows[0].ECNT

                let qe1 = 'SELECT EXCHANGE_LIMIT FROM CUSTOMER WHERE USER_ID = :user_id'
                let de1 = await conn.execute(qe1,[user_id])
                let emax = de1.rows[0].EXCHANGE_LIMIT;


        
                res.render('UserPageAfterLogin.ejs', {total_amount,bookshoparray,user_id,libraryarray,overdue_books,c,max,cnt,ecnt,emax});
            }
        }
    )
})




app.get('/booksinshop/:user_id',(req,res) => {
    let user_id = req.params.user_id;
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let query = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_ID = :shop_id'
                let data = await conn.execute(query,[shopID])
                let bookarray1 = data.rows

                let query1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID AS NUMBER_OF_COPIES FROM BORROWABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_ID = :shop_id'
                let data1 = await conn.execute(query1,[shopID])
                let bookarray2 = data1.rows


                let not_enough_copies = false;
                let cannot_add_to_more_shops = false;
                
                res.render('booksinshop.ejs',{user_id,bookarray1,bookarray2, not_enough_copies, cannot_add_to_more_shops})
            }
        }
    )
})

app.post('/booksinshop', (req,res) => {
    let user_id = req.body.USER_ID
    let book_id = req.body.BOOK_ID
    let shop_id = req.body.SHOP_ID
    let copy_no = req.body.COPY_NO

    let cannot_add_to_more_shops;
    let not_enough_copies;
    let val = false;
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let q3 = 'SELECT * FROM BUYABLE_SHOP_BOOKS WHERE SHOP_BOOK_ID = :book_id'
                let d3 = await conn.execute(q3,[book_id])
                let newcopies = Number(d3.rows[0].NUMBER_OF_COPIES) - Number(copy_no)
                if(newcopies < 0){
                    console.log('no more copies')
                    not_enough_copies = true;
                    cannot_add_to_more_shops = false;
                    let query = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_ID = :shop_id'
                    let data = await conn.execute(query,[shopID])
                    let bookarray1 = data.rows

                    
                    res.render('booksinshop.ejs',{user_id,bookarray1, not_enough_copies, cannot_add_to_more_shops})
                    val = true;

                }else{
                    let qq = 'SELECT * FROM CART WHERE USER_ID = :user_id'
                    let dd = await conn.execute(qq,[user_id])
                    let cartarray = dd.rows
                    for(let i = 0; i < cartarray.length; i++){
                        if(cartarray[i].SHOP_ID != shop_id){
                            cannot_add_to_more_shops = true;
                            not_enough_copies = false;
                        
                            let query = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_ID = :shop_id'
                            let data = await conn.execute(query,[shopID])
                            let bookarray1 = data.rows

                            
                            res.render('booksinshop.ejs',{user_id,bookarray1, not_enough_copies, cannot_add_to_more_shops})
                            val = true;
                        }
                    }

                    if(val == false){
                        let q4 = 'UPDATE BUYABLE_SHOP_BOOKS SET NUMBER_OF_COPIES = :newcopies WHERE SHOP_BOOK_ID = :book_id'
                        let d4 = await conn.execute(q4,[newcopies,book_id])

                        conn.commit()

                        console.log('ki je hcche');

                        let query = 'SELECT * FROM CART WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                        let data = await conn.execute(query,[user_id,shop_id])
                        if(data.rows.length == 0){
                            let q1 = 'SELECT MAX(CART_ID) AS LATEST_ID FROM CART'
                            let d1 = await conn.execute(q1)
                            let new_id;
                            if(d1.rows[0].LATEST_ID == null){
                                new_id = 1;
                            } else new_id = Number(d1.rows[0].LATEST_ID) + 1

                            let total_cost = 0;
                            let discount = 0;

                            let qq = 'INSERT INTO CART(CART_ID,USER_ID,SHOP_ID,TOTAL_COST,DISCOUNT) VALUES(:new_id,:user_id,:shop_id,:total_cost,:discount)'
                            let dd = await conn.execute(qq,[new_id,user_id,shop_id,total_cost,discount])
                            conn.commit()
                        }
                        let query5 = 'SELECT * FROM CART WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                        let data5 = await conn.execute(query5,[user_id,shop_id])
                        
                        console.log("total_cost")
                        console.log(data5.rows[0].TOTAL_COST)
                        console.log(d3.rows[0].SELLING_PRICE)
                        let new_cost = data5.rows[0].TOTAL_COST + copy_no * d3.rows[0].SELLING_PRICE
                        let cart_id = data5.rows[0].CART_ID

                        let query1 = 'UPDATE CART SET TOTAL_COST = :new_cost WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                        let data1 = await conn.execute(query1,[new_cost,user_id,shop_id])
                        conn.commit()
                        
                        let query2 = 'INSERT INTO CART_BOOKS(CART_ID,BOOK_ID,NUMBER_OF_COPIES) VALUES(:cart_id,:book_id,:copy_no)'
                        try{
                            let data2 = await conn.execute(query2,[cart_id,book_id,copy_no])
                            conn.commit()
                        }catch(e){
                            console.log(e)
                            let q1 = 'SELECT * FROM CART_BOOKS WHERE CART_ID = :cart_id AND BOOK_ID = :book_id'
                            let d1 = await conn.execute(q1,[cart_id,book_id])

                            let new_copies = Number(d1.rows[0].NUMBER_OF_COPIES) + Number(copy_no)
                            let q2 = 'UPDATE CART_BOOKS SET NUMBER_OF_COPIES=:newcopies WHERE CART_ID = :cart_id AND BOOK_ID = :book_id'
                            let d2 = await conn.execute(q2,[new_copies,cart_id,book_id])
                            conn.commit()

                        }
                    
                        res.render('bookaddedtocart.ejs',{user_id})
                        
                    }

                    /*let query3 = 'SELECT * FROM BUYABLE_BOOKS WHERE SHOP_ID = :shop_id'
                    console.log('shop')
                    console.log(shop_id)
                    let data2 = await conn.execute(query3,[shop_id])
                    let bookarray = data.rows
                    console.log(bookarray.length)
                    res.render('booksinshop.ejs',{user_id,bookarray})*/
                }
                
                
            }
        }
    )
})

app.get('/mycart/:user_id', (req,res) => {
    let user_id = req.params.user_id;
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let query = 'SELECT * FROM PUBLISHED_BOOKS WHERE BOOK_ID = (SELECT PUBLISHED_BOOK_ID FROM BUYABLE_SHOP_BOOKS WHERE BOOK_ID IN (SELECT BOOK_ID FROM CART_BOOKS WHERE CART_ID = (SELECT CART_ID FROM CART WHERE USER_ID = :user_id))'
                let query1 = 'SELECT C.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, (B.SELLING_PRICE * C.NUMBER_OF_COPIES) AS PRICE, B.SHOP_ID AS SHOP_ID, C.CART_ID AS CART_ID, C.BOOK_ID AS BOOK_ID, P.NAME AS NAME, P.GENRE AS GENRE FROM CART_BOOKS C JOIN BUYABLE_SHOP_BOOKS B ON (C.BOOK_ID=B.SHOP_BOOK_ID) JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE C.CART_ID = (SELECT CART_ID FROM CART WHERE USER_ID = :user_id)'
                let data = await conn.execute(query1,[user_id])
                let bookarray = data.rows
                console.log(bookarray)
                let first_received = false;
                let card_upgraded = false;
                if(bookarray.length == 0){
                    res.render("empty_cart.ejs",{user_id,first_received,card_upgraded})
                }else{
                    let shop_id = bookarray[0].SHOP_ID

                    let query2 = 'SELECT C.CART_ID AS CART_ID,G.CARD_LEVEL AS CARD_LEVEL, G.DISCOUNT_PER_LEVEL AS DISC_PER_LEV FROM CART C JOIN GIFT_CARD G ON (C.USER_ID = G.USER_ID AND C.SHOP_ID = G.SHOP_ID) WHERE C.USER_ID = :user_id'
                    let data1 = await conn.execute(query2,[user_id])
                    let total_cost;
                    let cart_id;
                    let card_level;
                    let discount;
                    let discount_percentage;
                    let disc_per_lev;
                        
                    //let discount_percentage;
                    if(data1.rows.length == 0){
                        let q1 = 'SELECT CART_ID, TOTAL_COST FROM CART WHERE USER_ID = :user_id'
                        let d1 = await conn.execute(q1,[user_id])
                        cart_id = d1.rows[0].CART_ID
                        total_cost = d1.rows[0].TOTAL_COST
                        discount = 0;
                        discount_percentage = 0;
                    }else{
                        cart_id = data1.rows[0].CART_ID
                        let query3 = 'SELECT GENERATE_DISCOUNT(CART_ID) AS DISCOUNT FROM CART WHERE CART_ID = :cart_id'
                        let d2 = await conn.execute(query3,[cart_id])
                        discount = d2.rows[0].DISCOUNT;
                        console.log('discount: ' + discount);

                        cart_id = data1.rows[0].CART_ID;
                        card_level = data1.rows[0].CARD_LEVEL;
                        disc_per_lev = data1.rows[0].DISC_PER_LEV;
                        console.log('disc: ' + disc_per_lev)
                        
                        discount_percentage = card_level * disc_per_lev;

                        if(discount_percentage > 50) discount_percentage = 50;

                        total_cost = Math.round((discount * 100) / discount_percentage);
                    }
                    

                    res.render('mycart.ejs',{user_id,bookarray,total_cost,cart_id,discount,discount_percentage})
                
                }
                }
        }
    )
})

app.get('/ur',(req,res) => {
    let userAge = 10;
    let userName = 'apro'
    res.render('some.ejs',{userAge,userName})
})

app.post('/mycart', (req,res) => {
    let shop_id = req.body.SHOP_ID
    let cart_id = req.body.CART_ID
    let user_id = req.body.USER_ID
    let discount_percentage = req.body.DISCOUNT_PERCENTAGE
    
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                
                let query1 = 'SELECT * FROM CART_BOOKS WHERE CART_ID = :cart_id'
                let data1 = await conn.execute(query1,[cart_id]);
                let books = data1.rows

                let query4 = 'SELECT SUM(NUMBER_OF_COPIES) AS PREV_BOOK_NO FROM PURCHASE WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                let data2 = await conn.execute(query4,[user_id,shop_id]);
                let prev_book_no = Number(data2.rows[0].PREV_BOOK_NO)


                for(let i = 0; i < books.length; i++){
                    let book_id = books[i].BOOK_ID
                    let copy_no = books[i].NUMBER_OF_COPIES
                    console.log('copy no: ' + copy_no)
                    let query1 = 'SELECT MAX(PURCHASE_ID) AS LATEST_ID FROM PURCHASE'
                    let d1 = await conn.execute(query1)
                    let new_id;
                    if(d1.rows[0].LATEST_ID == null){
                        new_id = 1
                    } else new_id = d1.rows[0].LATEST_ID + 1

                    let query3 = 'SELECT SELLING_PRICE FROM BUYABLE_SHOP_BOOKS WHERE SHOP_BOOK_ID = :book_id'
                    let d3 = await conn.execute(query3,[book_id])
                    let price = copy_no * ( Number(d3.rows[0].SELLING_PRICE) * ((1- discount_percentage /100)))
                    
                    let query2 = 'INSERT INTO PURCHASE(PURCHASE_ID,SHOP_ID,USER_ID,BOOK_ID,NUMBER_OF_COPIES,PRICE) VALUES(:new_id,:shop_id,:user_id,:book_id,:copy_no,:price)'
                    let d2 = await conn.execute(query2,[new_id,shop_id,user_id,book_id,copy_no,price])
                    conn.commit()
                }

                let upq = 'BEGIN ' +
                        '  UPDATING_COLLECTION; ' +
                        ' END;'
                let dq  = await conn.execute(upq);
                conn.commit()

                let delquery = 'DELETE FROM CART_BOOKS WHERE CART_ID = :cart_id'
                let deldata = await conn.execute(delquery,[cart_id])
                //console.log(deldata.rows)
                conn.commit()

                let delquery1 = 'DELETE FROM CART WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                let deldata1 = await conn.execute(delquery1,[user_id,shop_id])
                //console.log("deleted something")
                //console.log(deldata.rows)
                conn.commit()


                let query5 = 'SELECT SUM(NUMBER_OF_COPIES) AS NEW_BOOK_NO FROM PURCHASE WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                let data3 = await conn.execute(query5,[user_id,shop_id]);
                let new_book_no = Number(data3.rows[0].NEW_BOOK_NO)
                let first_received;
                let card_upgraded;
                console.log('prev book no: ' + prev_book_no + " new book no: " + new_book_no)

                if(prev_book_no < 10 && new_book_no >= 10){
                    let q1 = 'SELECT MAX(CARD_ID) AS LATEST_ID FROM GIFT_CARD'
                    let d1 = await conn.execute(q1) 
                    if(d1.rows[0].LATEST_ID != null){
                        let new_id = Number(d1.rows[0].LATEST_ID) + 1 
                        let card_level = 1
                        console.log(user_id)
                        console.log(shop_id)
                        let q = 'INSERT INTO GIFT_CARD(CARD_ID,USER_ID,SHOP_ID,CARD_LEVEL) VALUES(:new_id,:user_id,:shop_id,:card_level)'
                        let d = await conn.execute(q,[new_id,user_id,shop_id,card_level])
                        conn.commit()
                        first_received = true;
                
                    }else{
                        let new_id = 1 
                        let card_level = 1
                        let q = 'INSERT INTO GIFT_CARD(CARD_ID,USER_ID,SHOP_ID,CARD_LEVEL) VALUES(:new_id,:user_id,:shop_id,:card_level)'
                        let d = await conn.execute(q,[new_id,user_id,shop_id,card_level])
                        conn.commit()
                        first_received = true;
                    }
                }else if((new_book_no - (new_book_no % 10)) > prev_book_no){
                    let qq = 'SELECT DISCOUNT_PER_LEVEL,CARD_LEVEL FROM GIFT_CARD WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                    let dd = await conn.execute(qq,[user_id,shop_id]) 
                    let new_card_level = Math.trunc((new_book_no/10))
                    let disc_per_lev = dd.rows[0].DISCOUNT_PER_LEVEL

                    if(disc_per_lev * new_card_level <= 50){
                        let q = 'UPDATE GIFT_CARD SET CARD_LEVEL = :card_level WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                        let d = await conn.execute(q,[new_card_level,user_id,shop_id])
                        conn.commit()
                        card_upgraded = true;  
                    }
                
                }
                
                res.render("empty_cart.ejs",{user_id,first_received,card_upgraded})
            }
        }
    )
})

app.post('/mycart3',(req,res) => {
    let user_id = req.body.USER_ID
    let cart_id = req.body.CART_ID
    let book_id = req.body.BOOK_ID

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        
        },async (err,conn) =>{
            let delq = 'BEGIN ' +
                        ' REMOVE_FROM_CART(:cart_id,:book_id); ' +
                        ' END;';
            let dd = await conn.execute(delq,[cart_id,book_id])
            conn.commit();
            //Advances Query
            let query1 = 'SELECT C.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, (B.SELLING_PRICE * C.NUMBER_OF_COPIES) AS PRICE, B.SHOP_ID AS SHOP_ID, C.CART_ID AS CART_ID, C.BOOK_ID AS BOOK_ID, P.NAME AS NAME, P.GENRE AS GENRE FROM CART_BOOKS C JOIN BUYABLE_SHOP_BOOKS B ON (C.BOOK_ID=B.SHOP_BOOK_ID) JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE C.CART_ID = (SELECT CART_ID FROM CART WHERE USER_ID = :user_id)'
                let data = await conn.execute(query1,[user_id])
                let bookarray = data.rows
                console.log(bookarray)
                let first_received = false;
                let card_upgraded = false;
                if(bookarray.length == 0){
                    res.render("empty_cart.ejs",{user_id,first_received,card_upgraded})
                }else{
                    let shop_id = bookarray[0].SHOP_ID

                    let query2 = 'SELECT C.CART_ID AS CART_ID,G.CARD_LEVEL AS CARD_LEVEL, G.DISCOUNT_PER_LEVEL AS DISC_PER_LEV FROM CART C JOIN GIFT_CARD G ON (C.USER_ID = G.USER_ID AND C.SHOP_ID = G.SHOP_ID) WHERE C.USER_ID = :user_id'
                    let data1 = await conn.execute(query2,[user_id])
                    let total_cost;
                    let cart_id;
                    let card_level;
                    let discount;
                    let discount_percentage;
                    let disc_per_lev;
                        
                    //let discount_percentage;
                    if(data1.rows.length == 0){
                        let q1 = 'SELECT CART_ID, TOTAL_COST FROM CART WHERE USER_ID = :user_id'
                        let d1 = await conn.execute(q1,[user_id])
                        cart_id = d1.rows[0].CART_ID
                        total_cost = d1.rows[0].TOTAL_COST
                        discount = 0;
                        discount_percentage = 0;
                    }else{
                        cart_id = data1.rows[0].CART_ID
                        let query3 = 'SELECT GENERATE_DISCOUNT(CART_ID) AS DISCOUNT FROM CART WHERE CART_ID = :cart_id'
                        let d2 = await conn.execute(query3,[cart_id])
                        discount = d2.rows[0].DISCOUNT;
                        console.log('discount: ' + discount);

                        cart_id = data1.rows[0].CART_ID;
                        card_level = data1.rows[0].CARD_LEVEL;
                        disc_per_lev = data1.rows[0].DISC_PER_LEV;
                        console.log('disc: ' + disc_per_lev)
                        
                        discount_percentage = card_level * disc_per_lev;

                        if(discount_percentage > 50) discount_percentage = 50;

                        total_cost = Math.round((discount * 100) / discount_percentage);
                    }
                    

                    res.render('mycart.ejs',{user_id,bookarray,total_cost,cart_id,discount,discount_percentage})
                
                }
        }
        
    )
})

app.post('/mycart2', (req,res) => {
    let book_id = req.body.BOOK_ID
    let shop_id = req.body.SHOP_ID

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                //Advanced Query
                let q1 = 'SELECT C.NUMBER_OF_COPIES AS N_COPIES, B.PRICE AS PRICE, (C.NUMBER_OF_COPIES*B.PRICE) AS AMOUNT FROM CART_BOOKS C JOIN BUYABLE_BOOKS B ON C.SHOP_ID = B.SHOP_ID AND C.BOOK_ID = B.BOOK_ID WHERE B.SHOP_ID = :shop_id AND C.BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[shop_id,book_id])
                let amount = Number(d1.rows[0].AMOUNT)
                let copy_no = Number(d1.rows[0].N_COPIES)

                let q10 = 'SELECT * FROM GIFT_CARD WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                let d10 = await conn.execute(q10,[user_id,shop_id])
                
                if(d10.rows.length == 0){
                    res.render('nocards.ejs',{user_id})
                }else{
                    let q2 = 'DELETE FROM CART_BOOKS WHERE BOOK_ID = :book_id AND SHOP_ID = :shop_id'
                    let d2 = await conn.execute(q2,[book_id,shop_id])

                    conn.commit()

                    let q3 = 'SELECT * FROM CART WHERE USER_ID = :user_id'
                    let d3 = await conn.execute(q3,[user_id])
                    let new_copies = Number(d3.rows[0].TOTAL_NO_BOOKS) - copy_no

                    let q4 = 'UPDATE CART SET TOTAL_NO_BOOKS = :new_copies WHERE USER_ID = :user_id'
                    let d4 = await conn.execute(q4,[new_copies,user_id])

                    let q6 = 'SELECT MAX(PURCHASE_ID) AS LATEST_ID FROM PURCHASE'
                    let d6 = await conn.execute(q6)

                    let q11 = 'SELECT CARD_LEVEL FROM CARD WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                    let d11 = await conn.execute(q11,[user_id,shop_id])
                    let discount;
                    if(d11.rows.length == 0){
                        discount = 0
                    }
                    else discount = (Number(d11.rows[0].CARD_LEVEL) * 5 * amount) / 100

                    let purchase_id = d6.rows[0].LATEST_ID + 1
                    let method = 'CASH'
                    let final_amount = amount - discount
                    let q5 = 'INSERT INTO PURCHASE(PURCHASE_ID,SHOP_ID,BOOK_ID,USER_ID,AMOUNT,METHOD,NUMBER_OF_COPIES,FINAL_AMOUNT) VALUES(:purchase_id,:shop_id,:book_id,:user_id,:amount,:method,:copy_no,:final_amount)'
                    let d5 = await conn.execute(q5,[purchase_id,shop_id,book_id,user_id,amount,method,copy_no,final_amount])
                    conn.commit()

                    //Advanced Query
                    let q7 = 'SELECT SUM(NUMBER_OF_COPIES) AS TOTAL_BOOKS_BOUGHT FROM PURCHASE GROUP BY SHOP_ID, USER_ID HAVING SHOP_ID = :shop_id AND USER_ID = :user_id'
                    let d7 = await conn.execute(q7,[shop_id,user_id])
                    let total_books_bought = Number(d7.rows[0].TOTAL_BOOKS_BOUGHT)
                    
                    if(total_books_bought == 5){
                        let q12 = 'SELECT MAX(CARD_ID) AS LATEST_ID FROM GIFT_CARD'
                        let d12 = await conn.execute(q12)
                        let card_id = d12.rows[0].LATEST_ID + 1;
                        let card_level = 1;
                        let q8 = 'INSERT INTO GIFT_CARD(CARD_ID,USER_ID,SHOP_ID,CARD_LEVEL) VALUES(:card_id,:user_id,:shop_id,:card_level)'
                        let d8 = await conn.execute(q8,[card_id,user_id,shop_id,card_level])
                        conn.commit()
                    }else if(copy_no >= (10 - (total_books_bought - copy_no) % 10)){
                        let q9 = 'SELECT CARD_LEVEL,DISCOUNT_PER_LEVEL FROM GIFT_CARD WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                        let d9 = await conn.execute(q9,[user_id,shop_id])
                        
                        let q8 = 'UPDATE GIFT_CARD SET CARD_LEVEL = :new_level WHERE USER_ID = :user_id AND SHOP_ID = :shop_id'
                        let d8 = await conn.execute(q8,[new_level,user_id,shop_id])
                        conn.commit()
                    }

                    //Advanced Query
                    let query = 'SELECT * FROM BUYABLE_BOOKS WHERE BOOK_ID IN (SELECT BOOK_ID FROM CART_BOOKS WHERE CART_ID = (SELECT CART_ID FROM CART WHERE USER_ID = :user_id))'
                    let data = await conn.execute(query,[user_id])
                    let bookarray = data.rows

                    res.render('mycart.ejs',{user_id,bookarray})
                
                }

                
            }
        }
    )
})

app.post('/mycart1', (req,res) => {

})

app.post('/mycart1', (req,res) => {
    res.render()
})

app.get('/mycards/:user_id', (req,res) => {
    let user_id = req.params.user_id;
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let query = 'SELECT G.CARD_LEVEL AS CARD_LEVEL, S.NAME AS SHOP_NAME FROM GIFT_CARD G JOIN BOOKSHOP S ON G.SHOP_ID = S.SHOP_ID WHERE G.USER_ID = :user_id'
                let data = await conn.execute(query,[user_id])
                let cardarray = data.rows

                let q1 = 'SELECT C.CARD_LEVEL AS CARD_LEVEL, L.NAME AS NAME FROM LIBRARY_CARD C JOIN LIBRARY L ON (L.LIBRARY_ID = C.LIBRARY_ID) WHERE C.USER_ID = :user_id'
                let d1 = await conn.execute(q1,[user_id])
                let lc = d1.rows;

                res.render('mycards.ejs',{cardarray,user_id,lc})
            }
        }
    )
})


app.post('/booksinlibrary1', (req,res) => {
    let user_id = req.body.USER_ID
    let library_id = req.body.LIBRARY_ID
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let status = "Pending"
                let q1 = 'INSERT INTO MEMBERSHIP_APPLICATION(USER_ID,LIBRARY_ID,STATUS) VALUES(:user_id,:library_id,:status)'
                let d1 = await conn.execute(q1,[user_id,library_id,status])
                conn.commit();    
            }
        }
    )
})

function getMonthString(i){
    switch(i){
        case 1 :
            return 'JAN'
            break
        case 2 :
            return 'FEB'
            break
        case 3 :
            return 'MAR'
            break
        case 4 :
            return 'APR'
            break
                
        case 5 :
            return 'MAY'
            break
        case 6 :
            return 'JUN'
            break
        case 7 :
            return 'JUL'
            break
        case 8 :
            return 'AUG'
            break
        case 9 :
            return 'SEP'
            break
        case 10 :
            return 'OCT'
            break
                
        case 11 :
            return 'NOV'
            break
        case 12 :
            return 'DEC'
            break
                    
    }
}

app.post('/booksinlibrary2',(req,res) => {
   let user_id = req.body.USER_ID
   let library_id = req.body.LIBRARY_ID
   let book_id = req.body.BOOK_ID
   console.log("bbb: " + req.body.BOOK_ID)

   let date = new Date();

    let day = date.getDate();
    let mon = date.getMonth() + 1;
    let month = getMonthString(mon)
    let year = date.getFullYear();

    // This arrangement can be altered based on how we want the date's format to appear.
    let currentDate = `${day}-${month}-${year}`;
    console.log(currentDate); // "17-6-2022"

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
            
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let q = 'SELECT * FROM LIBRARY_CARD WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
                let d = await conn.execute(q,[user_id,library_id])
                let card_level = d.rows[0].CARD_LEVEL
                let card_id = d.rows[0].CARD_ID
                let day_limit = card_level * 7;
                date.setDate(date.getDate() + day_limit)

                let dt = date.getDate()
                let m = getMonthString(date.getMonth() + 1)
                let y = date.getFullYear()

                let last_return_date = `${dt}-${m}-${y}`;
                console.log(last_return_date)

                console.log('book_id ' + book_id)

                let q1 = 'SELECT P.NAME AS NAME FROM BORROWABLE_LIBRARY_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.LIBRARY_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                console.log('length ' + d1.rows.length)
                let bookname = d1.rows[0].NAME;
                let toomany = false;
                res.render('borrowinfo.ejs', {user_id,library_id,book_id,currentDate,last_return_date,card_level,bookname,card_id,toomany})
   
            }
            
        }
    )
    
})

app.post('/borrowinfo',(req,res) => {
    let user_id = Number(req.body.USER_ID)
    let library_id = Number(req.body.LIBRARY_ID)
    let start_date = req.body.START_DATE;
    console.log("date Type: " + typeof(start_date) + " date: " + start_date)
    let card_id = Number(req.body.CARD_ID)
    let book_id = Number(req.body.BOOK_ID)
    let number_of_copies = Number(req.body.NUMBER_OF_COPIES)
    
    let card_upgraded = false;

    console.log("all data " + user_id + " " + library_id + " " + card_id + " " + book_id)

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'   
        }, async (err,conn) => {
            let q = 'SELECT MAX(BORROW_ID) AS LATEST_ID FROM BORROW'
            let d = await conn.execute(q)
            let new_id;
            if(d.rows[0].LATEST_ID == 0) {
                new_id = 1
                console.log("nan " + isNaN(new_id))
            }
            else new_id = Number(d.rows[0].LATEST_ID) + 1

            console.log("type " + typeof(new_id) + " " + new_id)

            let late_fee = 0 
            console.log("typeof " + typeof(late_fee))
            let ret = null
            console.log(isNaN(user_id) + " " + isNaN(library_id) + " " + isNaN(card_id) + " " + isNaN(book_id) + " " + isNaN(late_fee) + " " + isNaN(new_id))

            try{
                let q1 = "INSERT INTO BORROW(BORROW_ID,USER_ID,BOOK_ID,LIBRARY_ID,START_TIME,RETURN_TIME,LATE_FEE,CARD_ID,NUMBER_OF_COPIES) VALUES(:new_id,:user_id,:book_id,:library_id,SYSDATE,:ret,:late_fee,:card_id,:number_of_copies)"
                let d1 = await conn.execute(q1,[new_id,user_id,book_id,library_id,ret,late_fee,card_id,number_of_copies])
                conn.commit()
            }catch(e){
                console.log(e);

                let q = 'SELECT * FROM LIBRARY_CARD WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
                let d = await conn.execute(q,[user_id,library_id])
                let card_level = d.rows[0].CARD_LEVEL
                let card_id = d.rows[0].CARD_ID
                let day_limit = card_level * 7;
                let date = new Date()
                let day = date.getDate();
                let mon = date.getMonth() + 1;
                let month = getMonthString(mon)
                let year = date.getFullYear();

                // This arrangement can be altered based on how we want the date's format to appear.
                let currentDate = `${day}-${month}-${year}`;
    
                date.setDate(date.getDate() + day_limit)

                let dt = date.getDate()
                let m = getMonthString(date.getMonth() + 1)
                let y = date.getFullYear()

                let last_return_date = `${dt}-${m}-${y}`;
                console.log(last_return_date)

                console.log('book_id ' + book_id)

                let q1 = 'SELECT P.NAME AS NAME FROM BORROWABLE_LIBRARY_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.LIBRARY_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                console.log('length ' + d1.rows.length)
                let bookname = d1.rows[0].NAME;
                let toomany = true;
                
                res.render('borrowinfo.ejs', {user_id,library_id,book_id,currentDate,last_return_date,card_level,bookname,card_id,toomany})
                return;

                //res.render('toomanycopies.ejs');
            }
            
            //Advanced Query
            let qq = 'SELECT SUM(NUMBER_OF_COPIES) AS BC FROM BORROW GROUP BY USER_ID,LIBRARY_ID HAVING USER_ID = :user_id AND LIBRARY_ID = :library_id'
            let dd = await conn.execute(qq,[user_id,library_id])
            let aftercount = dd.rows[0].BC;
            let beforecount = aftercount - number_of_copies
            
            if((aftercount - (aftercount % 10)) > beforecount ){
                let q = 'SELECT CARD_LEVEL FROM LIBRARY_CARD WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
                let d = await conn.execute(q,[user_id,library_id])
                let new_level = Math.trunc(aftercount/10)
                
                let q1 = 'UPDATE LIBRARY_CARD SET CARD_LEVEL = :new_level WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
                let d1 = await conn.execute(q1,[new_level,user_id,library_id])
                conn.commit();
                card_upgraded = true;
            }

            let q1 = 'SELECT IS_MEMBER(USER_ID,LIBRARY_ID) AS IS_MEM FROM MEMBERSHIP_APPLICATION WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
            let d1 = await conn.execute(q1,[user_id,library_id])
            let is_member;
            if(d1.rows.length != 0 && d1.rows[0].IS_MEM == "YES") is_member = true;
            else is_member = false;
            
            //Advanced Query
            let q2 = 'SELECT B.LIBRARY_ID AS LIBRARY_ID, B.LIBRARY_BOOK_ID AS BOOK_ID, B.STATUS AS STATUS, P.NAME AS NAME, P.GENRE AS GENRE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES FROM BORROWABLE_LIBRARY_BOOKS B JOIN PUBLISHED_BOOKS P ON B.PUBLISHED_BOOK_ID = P.BOOK_ID WHERE B.LIBRARY_ID = :library_id'
            let d2 = await conn.execute(q2,[library_id])
            let qb = "SELECT SUM(NUMBER_OF_COPIES) AS CNT FROM BORROW WHERE USER_ID = :user_id AND TRUNC(START_TIME,'DAY') = TRUNC(SYSDATE,'DAY')"
            let db1 = await conn.execute(qb,[user_id])
            let cnt = db1.rows[0].CNT

            let qq1 = 'SELECT BORROW_NUM_LIMIT FROM LIBRARY_CARD WHERE USER_ID = :user_id'
            let dd1 = await conn.execute(qq1,[user_id])
            let max = dd1.rows[0].BORROW_NUM_LIMIT

            let borrowconfirmed = true;
            let librarybooks = d2.rows;
            res.render('booksinlibrary.ejs',{is_member,librarybooks,user_id,library_id,max,cnt,borrowconfirmed,card_upgraded})
            
            
        }
    )
})

let req_count = 0

app.get('/borrowedbooks/:user_id', (req,res) => {
    let user_id = req.params.user_id;
    req_count++;

    if(req_count == 2) req_count = 0
    else{
        console.log(typeof(user_id))
        console.log(user_id)
        console.log('eta keno call hcche?')
        db.getConnection(
            {
                username: 'c##Trial',
                password: 'trial',
                connectString: 'localhost:1521/ORCLCDB'
            }, async (err,conn) => {
                if(err) console.log(err)
                else{
                    const q3 = 'UPDATE CUSTOMER SET USAGE_DAYS = SYSDATE - SIGN_UP_DATE WHERE USER_ID = :user_id'
                    const d3 = await conn.execute(q3,[user_id])
                    conn.commit()


                    // let q1 = 'SELECT PB.NAME AS NAME, PB.GENRE AS GENRE, P.NUMBER_OF_COPIES AS COPY_NO, (P.PRICE / P.NUMBER_OF_COPIES) AS PRICE, P.BOOK_ID AS BOOK_ID, P.SHOP_ID AS SHOP_ID FROM PURCHASE P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID = B.SHOP_BOOK_ID) JOIN PUBLISHED_BOOKS PB ON (PB.BOOK_ID = B.PUBLISHED_BOOK_ID) WHERE USER_ID = :user_id'
                    // let d1 = await conn.execute(q1,[user_id])
                    // let boughtbooks = d1.rows;
                    
                    //Advanced Query
                    let q20 = 'SELECT PB.NAME AS NAME, PB.GENRE AS GENRE, C.COPIES AS COPY_NO, (B.SELLING_PRICE) AS PRICE,C.BOOK_ID AS BOOK_ID,B.SHOP_ID AS SHOP_ID FROM USER_COLLECTION C JOIN BUYABLE_SHOP_BOOKS B ON(C.BOOK_ID = B.SHOP_BOOK_ID) JOIN PUBLISHED_BOOKS PB ON (PB.BOOK_ID = B.PUBLISHED_BOOK_ID) WHERE C.USER_ID = :user_id'
                    let dd20 = await conn.execute(q20,[user_id])
                    let boughtbooks = dd20.rows;

                    //Advanced Query
                    let q = 'SELECT P.NAME AS NAME, B.BOOK_ID AS BOOK_ID, B.RETURN_TIME AS RET_DATE,B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES,BL.LIBRARY_ID AS LIBRARY_ID, B.START_TIME AS START_TIME, (B.START_TIME + L.BORROW_DAY_LIMIT) AS RETURN_DAY_LIMIT, SYSDATE AS TODAYS_DATE, B.DAYS_REMAINING AS DAYS_REMAINING, B.LATE_FEE AS LATE_FEE FROM BORROW B JOIN LIBRARY_CARD L ON (B.CARD_ID = L.CARD_ID) JOIN BORROWABLE_LIBRARY_BOOKS BL ON (BL.LIBRARY_BOOK_ID = B.BOOK_ID) JOIN PUBLISHED_BOOKS P ON (BL.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.USER_ID = :user_id'
                    let d = await conn.execute(q,[user_id])
                    let borrowedbooks = d.rows
                    console.log('size: ' + borrowedbooks.length)
                    let date = new Date();
                    let dt = date.getDate()
                    let m = getMonthString(date.getMonth() + 1)
                    let y = date.getFullYear()

                    let todays_date = `${dt}-${m}-${y}`;

                    //Advanced Query
                    let q2 = 'SELECT EXTRACT(MONTH FROM PY.PAYMENT_DATE) AS MONTH, SUM(P.NUMBER_OF_COPIES) AS MONTHLY_COUNT ' +
                            'FROM PURCHASE P JOIN PAYMENT PY ON (P.TRANSACTION_ID = PY.TRANSACTION_ID) ' +
                            'WHERE P.USER_ID = :user_id ' + 
                            'GROUP BY EXTRACT(MONTH FROM PY.PAYMENT_DATE) ' +
                            'ORDER BY MONTH';
                    let d2 = await conn.execute(q2,[user_id]) 

                    let monthArray = d2.rows;
                    let boughtbookscount = [];
                    for(let i = 0; i < monthArray.length; i++){
                        boughtbookscount.push(monthArray[i].MONTHLY_COUNT)
                    }

                    while(boughtbookscount.length != 12){
                        boughtbookscount.push(0);
                    }
                    //Advanced Query
                    let q5 = 'SELECT EXTRACT(MONTH FROM START_TIME) AS MONTH, SUM(NUMBER_OF_COPIES) AS MONTHLY_COUNT ' +
                            'FROM BORROW ' +
                            'WHERE USER_ID = :user_id ' + 
                            'GROUP BY EXTRACT(MONTH FROM START_TIME) ' +
                            'ORDER BY MONTH';
                    let d5 = await conn.execute(q5,[user_id]) 

                    let monthArray1 = d5.rows;
                    let borrowedbookscount = [];
                    for(let i = 0; i < monthArray1.length; i++){
                        borrowedbookscount.push(monthArray1[i].MONTHLY_COUNT)
                    }

                    while(borrowedbookscount.length != 12){
                        borrowedbookscount.push(0);
                    }
                    //Advanced Query
                    let shopbookquery = 'SELECT SUM(P.NUMBER_OF_COPIES) AS BOOK_COUNT, B.NAME AS SHOP_NAME FROM PURCHASE P JOIN BOOKSHOP B ON (P.SHOP_ID = B.SHOP_ID) WHERE P.USER_ID = :user_id GROUP BY P.SHOP_ID, B.NAME ORDER BY P.SHOP_ID'
                    let d6 = await conn.execute(shopbookquery,[user_id])
                    let shopbooks = d6.rows;

                    let shopBooksCount = []
                    let shopNames = []

                    for(let i = 0; i < shopbooks.length; i++){
                        shopBooksCount.push(shopbooks[i].BOOK_COUNT)
                        shopNames.push(shopbooks[i].SHOP_NAME)
                    }

                    //Advanced Query
                    let spendingquery = 'SELECT EXTRACT(MONTH FROM PY.PAYMENT_DATE) AS MONTH, SUM(P.PRICE) AS MONTHLY_SPENDING ' +
                    'FROM PURCHASE P JOIN PAYMENT PY ON (P.TRANSACTION_ID = PY.TRANSACTION_ID) ' +
                    'WHERE P.USER_ID = :user_id ' + 
                    'GROUP BY EXTRACT(MONTH FROM PY.PAYMENT_DATE) ' +
                    'ORDER BY MONTH';

                    let data1 = await conn.execute(spendingquery,[user_id])
                    let spendingArray = data1.rows;

                    let spendings = []
                    for(let i = 0; i < spendingArray.length; i++){
                        spendings.push(spendingArray[i].MONTHLY_SPENDING)
                    }

                    let q10 = 'SELECT SUBSCRIPTION_TYPE AS SUBTYPE FROM SUBSCRIPTION WHERE USER_ID = :user_id'
                    let d10 = await conn.execute(q10,[user_id])
                    let type = d10.rows[0].SUBTYPE;

                    res.render('myborrowedbooks.ejs',{boughtbooks,borrowedbooks,todays_date,user_id, boughtbookscount, borrowedbookscount, shopBooksCount, shopNames, spendings, type})
                }

                    
            }
        )
    }
    
})

app.post('/mysub',(req,res) => {
    let user_id = req.body.USER_ID
    let type = req.body.type

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'  
        }, async (err,conn) => {
            if(err) console.log(err);
            else{
                res.render('mysub.ejs',{user_id,type});
            }
        }
    )
})

app.post('/freesub', (req,res) => {
    let user_id = req.body.USER_ID
    db.getConnection({
        username: 'c##Trial',
        password: 'trial',
        connectString: 'localhost:1521/ORCLCDB' 
    }, async (err,conn) => {
        if(err) console.log(err)
        else{
            let type = 'FREE' 
            let q = 'UPDATE SUBSCRIPTION SET SUBSCRIPTION_TYPE = :type WHERE USER_ID = :user_id'
            let d = await conn.execute(q,[type,user_id])
            conn.commit();

            let q1 ='BEGIN ' + 
                    ' SUB_RELATED_UPDATES(:user_id,:type); ' +

                    'END;';
            let d1 = await conn.execute(q1,[user_id,type])
            conn.commit();

            res.render('mysub.ejs',{user_id,type});
            
        }
    })
})


app.post('/prosub', (req,res) => {
    let user_id = req.body.USER_ID
    db.getConnection({
        username: 'c##Trial',
        password: 'trial',
        connectString: 'localhost:1521/ORCLCDB' 
    }, async (err,conn) => {
        if(err) console.log(err)
        else{
            let q2 = 'SELECT MAX(TRANSACTION_ID) AS LAT_ID FROM PAYMENT'
            let d2 = await conn.execute(q2);
            let new_id = d2.rows[0].LAT_ID + 1;

            let type = 'PRO' 
            let amount = 100
            
            let q3 = 'INSERT INTO PAYMENT(TRANSACTION_ID,USER_ID,AMOUNT,PAYMENT_TYPE,PAYMENT_DATE) VALUES(:new_id,:user_id,:amount,:type,SYSDATE)'
            let d3 = await conn.execute(q3,[new_id,user_id,amount,type])
            conn.commit()

            let q = 'UPDATE SUBSCRIPTION SET SUBSCRIPTION_TYPE = :type, TRANSACTION_ID = :new_id WHERE USER_ID = :user_id'
            let d = await conn.execute(q,[type,new_id,user_id])
            conn.commit();

            let q1 ='BEGIN ' + 
                    ' SUB_RELATED_UPDATES(:user_id,:type); ' +
                    'END;';
            let d1 = await conn.execute(q1,[user_id,type])
            conn.commit()
            res.render('mysub.ejs',{user_id,type});
            
            
        }
    })
})

app.post('/ultsub', (req,res) => {
    let user_id = req.body.USER_ID
    db.getConnection({
        username: 'c##Trial',
        password: 'trial',
        connectString: 'localhost:1521/ORCLCDB' 
    }, async (err,conn) => {
        if(err) console.log(err)
        else{
            let q2 = 'SELECT MAX(TRANSACTION_ID) AS LAT_ID FROM PAYMENT'
            let d2 = await conn.execute(q2);
            let new_id = d2.rows[0].LAT_ID + 1;

            let type = 'ULTIMATE' 
            let amount = 200
            
            let q3 = 'INSERT INTO PAYMENT(TRANSACTION_ID,USER_ID,AMOUNT,PAYMENT_TYPE,PAYMENT_DATE) VALUES(:new_id,:user_id,:amount,:type,SYSDATE)'
            let d3 = await conn.execute(q3,[new_id,user_id,amount,type])
            conn.commit()

            let q = 'UPDATE SUBSCRIPTION SET SUBSCRIPTION_TYPE = :type, TRANSACTION_ID = :new_id WHERE USER_ID = :user_id'
            let d = await conn.execute(q,[type,new_id,user_id])
            conn.commit();

            let q1 ='BEGIN ' + 
                    ' SUB_RELATED_UPDATES(:user_id,:type); ' +
                    'END;';
            let d1 = await conn.execute(q1,[user_id,type])
            conn.commit()
            res.render('mysub.ejs',{user_id,type});
            
            
        }
    })
})



app.post('/returnbook', (req,res) => {
    let user_id = req.body.USER_ID
    let library_id = req.body.LIBRARY_ID
    let book_id = req.body.BOOK_ID
    let late_fee = req.body.LATE_FEE

    console.log("where am i?")

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB' 
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let q = 'UPDATE BORROW SET RETURN_TIME = SYSDATE WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id AND BOOK_ID = :book_id'
                let d = await conn.execute(q,[user_id,library_id,book_id])
                conn.commit()

                if(late_fee == null) late_fee = 0;

                /*let q1 = 'SELECT NUMBER_OF_COPIES FROM BORROW WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id AND BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[user_id,library_id,book_id])

                let copy_no = d1.rows[0].NUMBER_OF_COPIES

                let q2 = 'UPDATE BORROWABLE_LIBRARY_BOOKS SET NUMBER_OF_COPIES = NUMBER_OF_COPIES + :copy_no WHERE LIBRARY_ID = :library_id AND LIBRARY_BOOK_ID = :book_id'
                let d2 = await conn.execute(q2,[copy_no,library_id,book_id])
                conn.commit()*/
                
                res.render('bookreturned.ejs', {user_id,late_fee})
            }
        }
    )
})

app.post('/allbooks1', (req,res) => {
    let user_id = req.body.USER_ID
    let shop_id = req.body.SHOP_ID
    let price = req.body.PRICE
    let copy_no = req.body.COPY_NO
    let book_id = req.body.BOOK_ID

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                let q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                let pbook = d1.rows[0];

                let q4 = 'SELECT NAME FROM BOOKSHOP WHERE SHOP_ID = :shop_id'
                let d4 = await conn.execute(q4,[shop_id]);
                let shopname = d4.rows[0].NAME
                
                let q2 = 'SELECT S.RATING AS RATING, S.REVIEW_BODY AS REVIEW_BODY, C.NAME AS NAME FROM SHOP_BOOK_REVIEW S JOIN CUSTOMER C ON (S.USER_ID = C.USER_ID) WHERE S.SHOP_BOOK_ID = :book_id'
                let d2 = await conn.execute(q2,[book_id])
                let allreviews = d2.rows

                let q3 = 'SELECT * FROM SHOP_BOOK_REVIEW WHERE SHOP_BOOK_ID = :book_id AND USER_ID = :user_id'
                let d3 = await conn.execute(q3,[book_id,user_id])
                let myreview;
                if(d3.rows.length == 0){
                    myreview = null;
                }
                else myreview = d3.rows[0];

                let q5 = 'SELECT NO_REVIEW(1) AS NO_REV FROM DUAL'
                let d5 = await conn.execute(q5)
                let no_rev = d5.rows[0].NO_REV

                console.log("u_id: " + user_id)

                res.render('purchasedbookdetails.ejs', {pbook,allreviews,myreview,user_id,price,copy_no,shopname,shop_id,book_id,no_rev})

            }
        }
    )
})

app.get('/librarylogin', (req,res) => {
    res.render('librarylogin.ejs')
})


app.post('/librarylogin', (req,res) => {
    let name = req.body.NAME;
    let password = req.body.PASSWORD
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                const q = 'select library_id from library where name = :name';
                const d = await conn.execute(q,[name])
                //console.log(name)
                //console.log(d.rows)
                let library_id = d.rows[0].LIBRARY_ID;

                const query = 'select * from library where library_id = :library_id'

                const ldata = await conn.execute(query,[library_id])
                const libraryarray = ldata.rows;
                
                if(libraryarray.length == 0) res.render('invalidpassid.ejs')
                else {
                    if(password != libraryarray[0].PASSWORD) res.render('invalidpassid.ejs')

                    else{
                        const q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BORROWABLE_LIBRARY_BOOKS B JOIN PUBLISHED_BOOKS P ON B.PUBLISHED_BOOK_ID = P.BOOK_ID WHERE B.LIBRARY_ID = :library_id'
                        const d1 = await conn.execute(q1,[library_id])
                        const librarybooks = d1.rows;
                        res.render('LibraryPageAfterLogin.ejs',{librarybooks,library_id})
                    }
                }
            }
        
        })
    }
)

app.get('/librarypageafterlogin/:library_id', (req,res) => {
    let library_id = req.params.library_id
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                
                const query = 'select * from library where library_id = :library_id'

                const ldata = await conn.execute(query,[library_id])
                const libraryarray = ldata.rows;
                
                if(libraryarray.length == 0) res.render('invalidpassid.ejs')
                else {
                    //if(password != libraryarray[0].PASSWORD) res.render('invalidpassid.ejs')

                    //else{
                        const q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BORROWABLE_LIBRARY_BOOKS B JOIN PUBLISHED_BOOKS P ON B.PUBLISHED_BOOK_ID = P.BOOK_ID WHERE B.LIBRARY_ID = :library_id'
                        const d1 = await conn.execute(q1,[library_id])
                        const librarybooks = d1.rows;
                        res.render('LibraryPageAfterLogin.ejs',{librarybooks,library_id})
                    
                }
            }
        
    })
})

app.get('/membershiprequests/:library_id', (req,res) => {
    let library_id = req.params.library_id;
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB' 
        }, async (err,conn) => {
            let q1 = 'SELECT C.NAME AS NAME, M.USER_ID AS USER_ID FROM MEMBERSHIP_APPLICATION M JOIN CUSTOMER C ON M.USER_ID = C.USER_ID WHERE M.LIBRARY_ID = :library_id'
            let d1 = await conn.execute(q1,[library_id])
            let applicants = d1.rows;
            

            res.render('applicants.ejs',{applicants,library_id})        
        }
    )
})

app.post('/membershiprequests/applicants1', (req,res) => {
    let user_id = req.body.USER_ID
    let library_id = req.body.LIBRARY_ID

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB' 
        }, async (err,conn) => {
            let status = "Accepted"
            let q1 = 'UPDATE MEMBERSHIP_APPLICATION SET STATUS = :status WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
            let d1 = await conn.execute(q1,[status,user_id,library_id])
            conn.commit();

            let q3 = 'SELECT MAX(CARD_ID) AS LATEST_ID FROM LIBRARY_CARD'
            let d3 = await conn.execute(q3)
            let new_id;
            if(d3.rows.length == 0) new_id = 1;
            else new_id = d3.rows[0].LATEST_ID + 1;
            
            let card_level = 1;
            let bdl = 7;
            let bnl = 5;

            let q2 = 'INSERT INTO LIBRARY_CARD(CARD_ID,USER_ID,LIBRARY_ID,CARD_LEVEL,BORROW_DAY_LIMIT,BORROW_NUM_LIMIT) VALUES(:new_id,:user_id,:library_id,:card_level,:bdl,:bnl)'
            let d2 = await conn.execute(q2,[new_id,user_id,library_id,card_level,bdl,bnl]);
            conn.commit()
        }
    )
})

app.post('/membershiprequests/applicants2', (req,res) => {
    let user_id = req.body.USER_ID
    let library_id = req.body.LIBRARY_ID

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB' 
        }, async (err,conn) => {
            let status = "Declined"
            let q1 = 'UPDATE MEMBERSHIP_APPLICATION SET STATUS = :status WHERE USER_ID = :user_id AND LIBRARY_ID = :library_id'
            let d1 = await conn.execute(q1,[status,user_id,library_id])
            conn.commit();
        }
    )
})

app.post('/exchangeOffer', (req, res) => {
    let shop_id = req.body.SHOP_ID;
    let user_id = req.body.USER_ID;
    console.log(user_id+ ' '+ shop_id);
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {

            let q1 = 'SELECT PB.NAME AS NAME, PB.GENRE AS GENRE, P.NUMBER_OF_COPIES AS COPY_NO, (P.PRICE / P.NUMBER_OF_COPIES) AS PRICE, P.BOOK_ID AS BOOK_ID, P.SHOP_ID AS SHOP_ID FROM PURCHASE P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID = B.SHOP_BOOK_ID) JOIN PUBLISHED_BOOKS PB ON (PB.BOOK_ID = B.PUBLISHED_BOOK_ID) WHERE USER_ID = :user_id '
            let d1 = await conn.execute(q1, [user_id])
            let boughtbooks = d1.rows;

            let q2 ='SELECT (SELECT P.NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = B.PUBLISHED_BOOK_ID)  AS NAME FROM BUYABLE_SHOP_BOOKS B  WHERE B.SHOP_ID = :shop_id AND B.SELLING_PRICE IS NOT NULL' ;
            let d2 = await conn.execute(q2, [shop_id])
            let shopbooks = d2.rows;
            res.render('exchangeForm.ejs', { user_id, shop_id,boughtbooks,shopbooks });
        })

})

app.post('/exchangeInfo/:user_id/:shop_id', (req, res) => {
    // let s_id = Number(req.body.SHOP_ID);
    // let u_id = Number(req.body.USER_ID);

    let s_id = req.body.SHOP_ID;
   let u_id = req.body.USER_ID;

    let exchangedBookName = (req.body.ExchangedBookName)//je boi shop dicche
    let OfferedBookName = (req.body.OfferedBookName)//je boi shop nicche
    let buyingPrice = req.body.BuyingPrice; // jeta nicche setar
    let sellingPrice = req.body.SellingPrice; //jeta nicche setar
    let condition = req. body.condition;

    //console.log(exchangedBookName);
    console.log(OfferedBookName);
    console.log(buyingPrice);
    console.log(sellingPrice);
    console.log(u_id + ' ' + s_id);
    console.log(condition);

    let decisionStatus = "PENDING";

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                console.log('correct connection inside exchange info post')
                //let query1 = "SELECT P.NAME AS NAME,B.SELLING_PRICE AS PRICE FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:exchangedBookName "
                let query1 = "SELECT P.NAME AS NAME,B.SELLING_PRICE AS PRICE FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME= :exchangedBookName AND B.SHOP_ID = :s_id"
                console.log(exchangedBookName)
                console.log(typeof(exchangedBookName))
                console.log(s_id)
                console.log(typeof(s_id))
                let data1 = await conn.execute(query1, [exchangedBookName, Number(s_id)]);
                let arr1 = data1.rows;
                console.log(arr1)
                if (arr1.length == 0) {
                    console.log('boi nai ki dibo');
                    res.render('exchangeOfferUnsuccessful.ejs');
                }
                else {
                    console.log('boi ase yee');

                    //Advanced Query
                    let q1 = 'SELECT PB.NAME AS NAME, PB.GENRE AS GENRE, P.NUMBER_OF_COPIES AS COPY_NO, (P.PRICE / P.NUMBER_OF_COPIES) AS PRICE, P.BOOK_ID AS BOOK_ID, P.SHOP_ID AS SHOP_ID FROM PURCHASE P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID = B.SHOP_BOOK_ID) JOIN PUBLISHED_BOOKS PB ON (PB.BOOK_ID = B.PUBLISHED_BOOK_ID) WHERE USER_ID = :user_id AND PB.NAME = :OfferedBookName'
                    let d1 = await conn.execute(q1, [u_id, OfferedBookName])
                    let boughtbooks = d1.rows;

                    if (boughtbooks.length == 0) {
                        res.render('exchangeOfferUnsuccessful2.ejs');
                    }
                    else {

                        let hasOfferedBook = true;
                        let query2 = "SELECT P.NAME AS NAME,B.SELLING_PRICE AS PRICE FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:OfferedBookName AND B.SHOP_ID = :s_id"
                        let data2 = await conn.execute(query2, [OfferedBookName, s_id]);
                        let arr2 = data2.rows;
                        if (arr2.length == 0) { hasOfferedBook = false; }

                        if (hasOfferedBook == true) {
                            console.log('Tomar boi o ase yee');
                            let OfferedBookRealPrice = arr2[0].PRICE;
                            let ExchangedBookRealPrice = arr1[0].PRICE;
                            let profit = OfferedBookRealPrice - ExchangedBookRealPrice;

                            //determining exchange id
                            let e1 = "SELECT MAX(EXCHANGE_ID) AS LATEST_ID FROM EXCHANGE";
                            let e2 = await conn.execute(e1);
                            let exchange_id = e2.rows[0].LATEST_ID + 1;

                            //finding out exchanged book id
                            //let e3 = "SELECT P.BOOK_ID AS EXCHANGED_BOOK_ID FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:exchangedBookName ";
                            let e3 = "SELECT B.SHOP_BOOK_ID AS EXCHANGED_BOOK_ID FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:exchangedBookName ";
                            let e4 = await conn.execute(e3, [exchangedBookName]);
                            let exchanged_book_id = e4.rows[0].EXCHANGED_BOOK_ID;

                            //finding out returned book id
                            let e5 = "SELECT P.BOOK_ID AS RETURNED_BOOK_ID FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:OfferedBookName ";
                            let e6 = await conn.execute(e5, [OfferedBookName]);
                            let returned_book_id = e6.rows[0].RETURNED_BOOK_ID;

                            //finding out RETURNED_BOOK_PRICE
                            let e7 = "SELECT B.SELLING_PRICE AS PRICE FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:OfferedBookName "
                            let e8 = await conn.execute(e7, [OfferedBookName]);
                            let offered_book_real_price = e8.rows[0].PRICE;

                            //finding out EXCHANGED_BOOK_PRICE
                            let e9 = "SELECT B.SELLING_PRICE AS PRICE FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:exchangedBookName "
                            let e10 = await conn.execute(e9, [exchangedBookName]);
                            let exchanged_book_price = e10.rows[0].PRICE;

                            //finding user id
                            let q1 = "select USER_ID FROM CUSTOMER WHERE USER_ID = :user_id";
                            let d1 = await conn.execute(q1, [u_id]);
                            let a1 = d1.rows;
                            let insert_user_id = a1[0].USER_ID;

                            let insertQuery = 'INSERT INTO EXCHANGE(EXCHANGE_ID,EXCHANGED_BOOK_ID,RETURNED_BOOK_ID,SHOP_ID,OFFERED_BOOK_BUYING_PRICE,OFFERED_BOOK_SELLING_PRICE,OFFERED_BOOK_REAL_PRICE,USER_ID,EXCHANGED_BOOK_PRICE,PROFIT,STATUS,CONDITION) VALUES(:exchange_id,:exchanged_book_id,:returned_book_id,:s_id,:buyingPrice,:sellingPrice,:offered_book_real_price,:insert_user_id,:exchanged_book_price,:profit,:decisionStatus,:condition)';
                            let insertData = await conn.execute(insertQuery, [exchange_id, exchanged_book_id, returned_book_id, s_id, buyingPrice, sellingPrice, offered_book_real_price, insert_user_id, exchanged_book_price, profit, decisionStatus,condition]);
                            conn.commit();
                            exchange_id++;

                            res.render('exchangeOfferSuccessful.ejs', { OfferedBookRealPrice, ExchangedBookRealPrice, profit });
                        }
                        else {
                            console.log('Tomar boi nai :/');
                            let OfferedBookRealPrice = sellingPrice;   //bookshop nicche
                            let ExchangedBookRealPrice = arr1[0].PRICE;   //bookshop dicche
                            let profit = OfferedBookRealPrice - ExchangedBookRealPrice;

                            //determining exchange id
                            let e1 = "SELECT MAX(EXCHANGE_ID) AS LATEST_ID FROM EXCHANGE";
                            let e2 = await conn.execute(e1);
                            let exchange_id = e2.rows[0].LATEST_ID + 1;
                            console.log('exchange id paisi:' + exchange_id);

                            //finding out exchanged book id
                            //let e3 = "SELECT P.BOOK_ID AS EXCHANGED_BOOK_ID FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:exchangedBookName ";
                            let e3 = "SELECT B.SHOP_BOOK_ID AS EXCHANGED_BOOK_ID FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:exchangedBookName ";
                            let e4 = await conn.execute(e3, [exchangedBookName]);
                            let exchanged_book_id = Number(e4.rows[0].EXCHANGED_BOOK_ID);
                            console.log('exchange book id paisi:' + exchanged_book_id);

                            //finding out returned book id
                            let e5 = "SELECT BOOK_ID AS RETURNED_BOOK_ID FROM PUBLISHED_BOOKS WHERE NAME=:OfferedBookName ";
                            let e6 = await conn.execute(e5, [OfferedBookName]);
                            let returned_book_id = e6.rows[0].RETURNED_BOOK_ID;//+1;
                            console.log('return book id paisi : ' + returned_book_id);

                            //finding out RETURNED_BOOK_PRICE
                            let offered_book_real_price = sellingPrice;
                            console.log(offered_book_real_price);

                            //finding out EXCHANGED_BOOK_PRICE
                            let e9 = "SELECT B.SELLING_PRICE AS PRICE FROM PUBLISHED_BOOKS P JOIN BUYABLE_SHOP_BOOKS B ON (P.BOOK_ID= B.PUBLISHED_BOOK_ID) WHERE P.NAME=:exchangedBookName "
                            let e10 = await conn.execute(e9, [exchangedBookName]);
                            let exchanged_book_price = e10.rows[0].PRICE;
                            console.log('exchanged_book_price paisi: ' + exchanged_book_price);

                            let q1 = "select USER_ID FROM CUSTOMER WHERE USER_ID = :user_id";
                            let d1 = await conn.execute(q1, [u_id]);
                            let a1 = d1.rows;
                            let insert_user_id = a1[0].USER_ID;
                            console.log("exch " + returned_book_id);
                            console.log(s_id);
                            console.log(u_id);

                            let insertQuery = 'INSERT INTO EXCHANGE(EXCHANGE_ID,EXCHANGED_BOOK_ID,RETURNED_BOOK_ID,SHOP_ID,OFFERED_BOOK_BUYING_PRICE,OFFERED_BOOK_SELLING_PRICE,OFFERED_BOOK_REAL_PRICE,USER_ID,EXCHANGED_BOOK_PRICE,PROFIT,STATUS,CONDITION) VALUES(:exchange_id,:exchanged_book_id,:returned_book_id,:s_id,:buyingPrice,:sellingPrice,:offered_book_real_price,:u_id,:exchanged_book_price,:profit,:decisionStatus,:condition)';
                            let insertData = await conn.execute(insertQuery, [exchange_id, exchanged_book_id, returned_book_id, s_id, buyingPrice, sellingPrice, offered_book_real_price, u_id, exchanged_book_price, profit, decisionStatus,condition]);
                            conn.commit();
                            exchange_id++;

                            res.render('exchangeOfferSuccessful.ejs', { OfferedBookRealPrice, ExchangedBookRealPrice, profit });
                        }
                    }
                }
            }
        }
    )
})

app.get('/myoffers/:user_id', (req, res) => {
    let user_id = req.params.user_id;
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                //Advanced Query
                let query = 'SELECT U.USER_ID AS U_ID,' +
                'C.NAME AS U_NAME, ' +
                'C.EMAIL AS U_EMAIL, ' +
                'MAX((SELECT NAME FROM PUBLISHED_BOOKS WHERE BOOK_ID = U.BOOK_ID)) AS BOOK_NAME ' +
         'FROM CUSTOMER C ' +
         'JOIN USER_COLLECTION U ON C.USER_ID = U.USER_ID ' +
         'WHERE C.USER_ID <> 1 '
         'GROUP BY U.USER_ID, C.NAME, C.EMAIL';
                let data = await conn.execute(query, [user_id]);
                let offerarray = data.rows;

                res.render('myoffers.ejs', {offerarray,user_id});
            }
        }
    )
})

app.get('/exchangeOffersForShop', (req, res) => {
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                //Advanced Query
                let query = 'SELECT DISTINCT E.EXCHANGE_ID AS EXCHANGE_ID , E. PROFIT AS PROFIT, C.USER_ID AS USER_ID,C.EMAIL AS EMAIL, C.NAME AS USER_NAME,B.NAME AS SHOP_NAME, (SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.RETURNED_BOOK_ID ) AS OFFERED_BOOK_NAME ,(SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.EXCHANGED_BOOK_ID ) AS EXCHANGED_BOOK_NAME,E.EXCHANGED_BOOK_PRICE,E.OFFERED_BOOK_REAL_PRICE FROM EXCHANGE E JOIN BOOKSHOP B ON (E.SHOP_ID = B.SHOP_ID) JOIN BUYABLE_SHOP_BOOKS S ON (S.SHOP_ID = B.SHOP_ID) JOIN CUSTOMER C ON(C.USER_ID=E.USER_ID)  WHERE E.SHOP_ID = :shopID';
                let data = await conn.execute(query, [id]);
                console.log(id);
                let offerarrayShop = data.rows;
                console.log(offerarrayShop.length);

                res.render('exchangeOffersForShop.ejs', {offerarrayShop});
            }
        }
    )
})

app.post('/acceptExchangeOffer', (req, res) => {
    let exchange_id = req.body.EXCHANGE_ID;
    let decisionStatus = "Accepted";

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                let query = 'UPDATE EXCHANGE SET STATUS =:decisionStatus WHERE EXCHANGE_ID = :exchange_id';
                let data = await conn.execute(query, [decisionStatus,exchange_id]);
                conn.commit();

                

            }
        }
    )
})

app.post('/declineExchangeOffer', (req, res) => {
    let exchange_id = req.body.EXCHANGE_ID;
    let decisionStatus = "Declined";

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                let query = 'UPDATE EXCHANGE SET STATUS =:decisionStatus WHERE EXCHANGE_ID = :exchange_id';
                let data = await conn.execute(query, [decisionStatus,exchange_id]);
                conn.commit();

              //  res.render('ShopPageAfterLogin.ejs', { shoparray, bookarray })
            }
        }
    )
})

app.post('/purchasedbook1', (req,res) => {
    let user_id = req.body.USER_ID
    let shop_id = req.body.SHOP_ID
    let price = req.body.PRICE
    let copy_no = req.body.COPY_NO
    let book_id = req.body.BOOK_ID
    let review = req.body.REV

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                console.log('here');
                if(review == null){
                    let qq3 = 'SELECT MAX(REVIEW_ID) AS LATEST_ID FROM SHOP_BOOK_REVIEW'
                    let dq3 = await conn.execute(qq3)
                    let new_id;
                    if(dq3.rows.length == 0) new_id = 1;
                    else new_id = dq3.rows[0].LATEST_ID + 1;

                    let currently_reading = 'Yes';
                    let qq = 'INSERT INTO SHOP_BOOK_REVIEW(REVIEW_ID,SHOP_BOOK_ID,USER_ID,CURRENTLY_READING) VALUES(:new_id,:book_id,:user_id,:currently_reading)'
                    let dd = await conn.execute(qq,[new_id,book_id,user_id,currently_reading])
                    conn.commit();
                }else{
                    let c = 'Yes';
                    let q = 'UPDATE SHOP_BOOK_REVIEW SET CURRENTLY_READING = :c WHERE USER_ID = :user_id AND SHOP_BOOK_ID = :book_id'
                    let d = await conn.execute(q,[c,user_id,book_id])
                    conn.commit(); 
                }
                            
                
                let qq2 = 'SELECT P.CURRENT_NO_READERS AS CURRENT_NO_READERS, P.BOOK_ID AS PB_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_BOOK_ID = :book_id'
                let dd2 = await conn.execute(qq2,[book_id])
                let new_no_readers = dd2.rows[0].CURRENT_NO_READERS + 1;
                let pb_id = dd2.rows[0].PB_ID;

                let qq4 = 'UPDATE PUBLISHED_BOOKS SET CURRENT_NO_READERS = :new_no_readers WHERE BOOK_ID = :pb_id'
                let dd4 = await conn.execute(qq4,[new_no_readers,pb_id])
                conn.commit()

                let q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                let pbook = d1.rows[0];

                let q4 = 'SELECT NAME FROM BOOKSHOP WHERE SHOP_ID = :shop_id'
                let d4 = await conn.execute(q4,[shop_id]);
                let shopname = d4.rows[0].NAME
                
                let q2 = 'SELECT S.RATING AS RATING, S.REVIEW_BODY AS REVIEW_BODY, C.NAME AS NAME FROM SHOP_BOOK_REVIEW S JOIN CUSTOMER C ON (S.USER_ID = C.USER_ID) WHERE S.SHOP_BOOK_ID = :book_id'
                let d2 = await conn.execute(q2,[book_id])
                let allreviews = d2.rows

                let q3 = 'SELECT * FROM SHOP_BOOK_REVIEW WHERE SHOP_BOOK_ID = :book_id AND USER_ID = :user_id'
                let d3 = await conn.execute(q3,[book_id,user_id])
                let myreview;
                if(d3.rows.length == 0){
                    myreview = null;
                }
                else myreview = d3.rows[0];

                let q5 = 'SELECT NO_REVIEW(1) AS NO_REV FROM DUAL'
                let d5 = await conn.execute(q5)
                let no_rev = d5.rows[0].NO_REV


                res.render('purchasedbookdetails.ejs', {pbook,allreviews,myreview,user_id,price,copy_no,shopname,shop_id,book_id,no_rev})

            }
        }
    )
})


app.post('/purchasedbook2', (req,res) => {
    let user_id = req.body.USER_ID
    let shop_id = req.body.SHOP_ID
    let price = req.body.PRICE
    let copy_no = req.body.COPY_NO
    let book_id = req.body.BOOK_ID
    let review = req.body.REV

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                console.log('REV ' + typeof(review));
                if(review == ''){
                    console.log("am i here?")
                    let qq3 = 'SELECT MAX(REVIEW_ID) AS LATEST_ID FROM SHOP_BOOK_REVIEW'
                    let dq3 = await conn.execute(qq3)
                    let new_id;
                    if(dq3.rows.length == 0) new_id = 1;
                    else new_id = dq3.rows[0].LATEST_ID + 1;

                    let finished_reading = 'Yes';
                    let qq = 'INSERT INTO SHOP_BOOK_REVIEW(REVIEW_ID,SHOP_BOOK_ID,USER_ID,FINISHED_READING) VALUES(:new_id,:book_id,:user_id,:finished_reading)'
                    let dd = await conn.execute(qq,[new_id,book_id,user_id,finished_reading])
                    conn.commit();
                }else{
                    let c = 'Yes';
                    let q = 'UPDATE SHOP_BOOK_REVIEW SET FINISHED_READING = :c WHERE USER_ID = :user_id AND SHOP_BOOK_ID = :book_id'
                    let d = await conn.execute(q,[c,user_id,book_id])
                    conn.commit(); 
                }
                            
                
                let q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                let pbook = d1.rows[0];

                let q4 = 'SELECT NAME FROM BOOKSHOP WHERE SHOP_ID = :shop_id'
                let d4 = await conn.execute(q4,[shop_id]);
                let shopname = d4.rows[0].NAME
                
                let q2 = 'SELECT S.RATING AS RATING, S.REVIEW_BODY AS REVIEW_BODY, C.NAME AS NAME FROM SHOP_BOOK_REVIEW S JOIN CUSTOMER C ON (S.USER_ID = C.USER_ID) WHERE S.SHOP_BOOK_ID = :book_id'
                let d2 = await conn.execute(q2,[book_id])
                let allreviews = d2.rows

                let q3 = 'SELECT * FROM SHOP_BOOK_REVIEW WHERE SHOP_BOOK_ID = :book_id AND USER_ID = :user_id'
                let d3 = await conn.execute(q3,[book_id,user_id])
                let myreview;
                if(d3.rows.length == 0){
                    myreview = null;
                }
                else myreview = d3.rows[0];

                let q5 = 'SELECT NO_REVIEW(1) AS NO_REV FROM DUAL'
                let d5 = await conn.execute(q5)
                let no_rev = d5.rows[0].NO_REV


                res.render('purchasedbookdetails.ejs', {pbook,allreviews,myreview,user_id,price,copy_no,shopname,shop_id,book_id,no_rev})

            }
        }
    )
})

app.post('/purchasedbook3', (req,res) => {
    let user_id = req.body.USER_ID
    let shop_id = req.body.SHOP_ID
    let price = req.body.PRICE
    let copy_no = req.body.COPY_NO
    let book_id = req.body.BOOK_ID
    let review = req.body.REV
    let rating = req.body.RATING

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                console.log('here');
                if(review == ''){
                    let qq3 = 'SELECT MAX(REVIEW_ID) AS LATEST_ID FROM SHOP_BOOK_REVIEW'
                    let dq3 = await conn.execute(qq3)
                    let new_id;
                    if(dq3.rows.length == 0) new_id = 1;
                    else new_id = dq3.rows[0].LATEST_ID + 1;

                    //let finished_reading = 'Yes';
                    let qq = 'INSERT INTO SHOP_BOOK_REVIEW(REVIEW_ID,SHOP_BOOK_ID,USER_ID,RATING) VALUES(:new_id,:book_id,:user_id,:rating)'
                    let dd = await conn.execute(qq,[new_id,book_id,user_id,rating])
                    conn.commit();
                }else{
                    let c = 'Yes';
                    let q = 'UPDATE SHOP_BOOK_REVIEW SET RATING = :rating WHERE USER_ID = :user_id AND SHOP_BOOK_ID = :book_id'
                    let d = await conn.execute(q,[rating,user_id,book_id])
                    conn.commit(); 
                }
                            
                
                let q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                let pbook = d1.rows[0];

                let q4 = 'SELECT NAME FROM BOOKSHOP WHERE SHOP_ID = :shop_id'
                let d4 = await conn.execute(q4,[shop_id]);
                let shopname = d4.rows[0].NAME
                
                let q2 = 'SELECT S.RATING AS RATING, S.REVIEW_BODY AS REVIEW_BODY, C.NAME AS NAME FROM SHOP_BOOK_REVIEW S JOIN CUSTOMER C ON (S.USER_ID = C.USER_ID) WHERE S.SHOP_BOOK_ID = :book_id'
                let d2 = await conn.execute(q2,[book_id])
                let allreviews = d2.rows

                let q3 = 'SELECT * FROM SHOP_BOOK_REVIEW WHERE SHOP_BOOK_ID = :book_id AND USER_ID = :user_id'
                let d3 = await conn.execute(q3,[book_id,user_id])
                let myreview;
                if(d3.rows.length == 0){
                    myreview = null;
                }
                else myreview = d3.rows[0];

                let q5 = 'SELECT NO_REVIEW(1) AS NO_REV FROM DUAL'
                let d5 = await conn.execute(q5)
                let no_rev = d5.rows[0].NO_REV


                res.render('purchasedbookdetails.ejs', {pbook,allreviews,myreview,user_id,price,copy_no,shopname,shop_id,book_id,no_rev})

            }
        }
    )
})

app.post('/purchasedbook5', (req,res) => {
    let user_id = req.body.USER_ID
    let shop_id = req.body.SHOP_ID
    let price = req.body.PRICE
    let copy_no = req.body.COPY_NO
    let book_id = req.body.BOOK_ID
    //let review = req.body.REV
    let rating = req.body.RATING

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                console.log('here');
                    let c = 'Yes';
                    let q = 'UPDATE SHOP_BOOK_REVIEW SET RATING = :rating WHERE USER_ID = :user_id AND SHOP_BOOK_ID = :book_id'
                    let d = await conn.execute(q,[rating,user_id,book_id])
                    conn.commit(); 
                            
                
                let q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                let pbook = d1.rows[0];

                let q4 = 'SELECT NAME FROM BOOKSHOP WHERE SHOP_ID = :shop_id'
                let d4 = await conn.execute(q4,[shop_id]);
                let shopname = d4.rows[0].NAME
                
                let q2 = 'SELECT S.RATING AS RATING, S.REVIEW_BODY AS REVIEW_BODY, C.NAME AS NAME FROM SHOP_BOOK_REVIEW S JOIN CUSTOMER C ON (S.USER_ID = C.USER_ID) WHERE S.SHOP_BOOK_ID = :book_id'
                let d2 = await conn.execute(q2,[book_id])
                let allreviews = d2.rows

                let q3 = 'SELECT * FROM SHOP_BOOK_REVIEW WHERE SHOP_BOOK_ID = :book_id AND USER_ID = :user_id'
                let d3 = await conn.execute(q3,[book_id,user_id])
                let myreview;
                if(d3.rows.length == 0){
                    myreview = null;
                }
                else myreview = d3.rows[0];

                let q5 = 'SELECT NO_REVIEW(1) AS NO_REV FROM DUAL'
                let d5 = await conn.execute(q5)
                let no_rev = d5.rows[0].NO_REV


                res.render('purchasedbookdetails.ejs', {pbook,allreviews,myreview,user_id,price,copy_no,shopname,shop_id,book_id,no_rev})

            }
        }
    )
})

app.post('/purchasedbook6', (req,res) => {
    let user_id = req.body.USER_ID
    let shop_id = req.body.SHOP_ID
    let price = req.body.PRICE
    let copy_no = req.body.COPY_NO
    let book_id = req.body.BOOK_ID
    let review = req.body.REV
    let rev_body = req.body.REVIEW_BODY

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                console.log('here');
                if(review == ''){
                    let qq3 = 'SELECT MAX(REVIEW_ID) AS LATEST_ID FROM SHOP_BOOK_REVIEW'
                    let dq3 = await conn.execute(qq3)
                    let new_id;
                    if(dq3.rows.length == 0) new_id = 1;
                    else new_id = dq3.rows[0].LATEST_ID + 1;

                    //let finished_reading = 'Yes';
                    let qq = 'INSERT INTO SHOP_BOOK_REVIEW(REVIEW_ID,SHOP_BOOK_ID,USER_ID,REVIEW_BODY) VALUES(:new_id,:book_id,:user_id,:rev_body)'
                    let dd = await conn.execute(qq,[new_id,book_id,user_id,rev_body])
                    conn.commit();
                }else{
                    let c = 'Yes';
                    let q = 'UPDATE SHOP_BOOK_REVIEW SET REVIEW_BODY = :rev_body WHERE USER_ID = :user_id AND SHOP_BOOK_ID = :book_id'
                    let d = await conn.execute(q,[rev_body,user_id,book_id])
                    conn.commit(); 
                }
                            
                
                let q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                let pbook = d1.rows[0];

                let q4 = 'SELECT NAME FROM BOOKSHOP WHERE SHOP_ID = :shop_id'
                let d4 = await conn.execute(q4,[shop_id]);
                let shopname = d4.rows[0].NAME
                
                let q2 = 'SELECT S.RATING AS RATING, S.REVIEW_BODY AS REVIEW_BODY, C.NAME AS NAME FROM SHOP_BOOK_REVIEW S JOIN CUSTOMER C ON (S.USER_ID = C.USER_ID) WHERE S.SHOP_BOOK_ID = :book_id'
                let d2 = await conn.execute(q2,[book_id])
                let allreviews = d2.rows

                let q3 = 'SELECT * FROM SHOP_BOOK_REVIEW WHERE SHOP_BOOK_ID = :book_id AND USER_ID = :user_id'
                let d3 = await conn.execute(q3,[book_id,user_id])
                let myreview;
                if(d3.rows.length == 0){
                    myreview = null;
                }
                else myreview = d3.rows[0];

                let q5 = 'SELECT NO_REVIEW(1) AS NO_REV FROM DUAL'
                let d5 = await conn.execute(q5)
                let no_rev = d5.rows[0].NO_REV


                res.render('purchasedbookdetails.ejs', {pbook,allreviews,myreview,user_id,price,copy_no,shopname,shop_id,book_id,no_rev})

            }
        }
    )
})

app.post('/purchasedbook8', (req,res) => {
    let user_id = req.body.USER_ID
    let shop_id = req.body.SHOP_ID
    let price = req.body.PRICE
    let copy_no = req.body.COPY_NO
    let book_id = req.body.BOOK_ID
    //let review = req.body.REV
    let rev_body = req.body.REVIEW_BODY

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err,conn) => {
            if(err) console.log(err)
            else{
                console.log('here');
                    let c = 'Yes';
                    let q = 'UPDATE SHOP_BOOK_REVIEW SET REVIEW_BODY = :rev_body WHERE USER_ID = :user_id AND SHOP_BOOK_ID = :book_id'
                    let d = await conn.execute(q,[rev_body,user_id,book_id])
                    conn.commit(); 
                
                            
                
                let q1 = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SHOP_BOOK_ID = :book_id'
                let d1 = await conn.execute(q1,[book_id])
                let pbook = d1.rows[0];

                let q4 = 'SELECT NAME FROM BOOKSHOP WHERE SHOP_ID = :shop_id'
                let d4 = await conn.execute(q4,[shop_id]);
                let shopname = d4.rows[0].NAME
                
                let q2 = 'SELECT S.RATING AS RATING, S.REVIEW_BODY AS REVIEW_BODY, C.NAME AS NAME FROM SHOP_BOOK_REVIEW S JOIN CUSTOMER C ON (S.USER_ID = C.USER_ID) WHERE S.SHOP_BOOK_ID = :book_id'
                let d2 = await conn.execute(q2,[book_id])
                let allreviews = d2.rows

                let q3 = 'SELECT * FROM SHOP_BOOK_REVIEW WHERE SHOP_BOOK_ID = :book_id AND USER_ID = :user_id'
                let d3 = await conn.execute(q3,[book_id,user_id])
                let myreview;
                if(d3.rows.length == 0){
                    myreview = null;
                }
                else myreview = d3.rows[0];

                let q5 = 'SELECT NO_REVIEW(1) AS NO_REV FROM DUAL'
                let d5 = await conn.execute(q5)
                let no_rev = d5.rows[0].NO_REV


                res.render('purchasedbookdetails.ejs', {pbook,allreviews,myreview,user_id,price,copy_no,shopname,shop_id,book_id,no_rev})

            }
        }
    )
})

app.get('/search/:user_id', (req, res) => {
    let user_id = req.params.user_id
    db.getConnection(
        {
            username: "c##Trial",
            password: "trial",
            connectString: "localhost:1521/ORCLCDB"
        }, async (err, conn) => {
            if (err) {
                console.log('connection failed')
            } else {

                res.render('searchPage.ejs',{user_id});
            }
        }
    )
})


app.post('/searchBooks', (req, res) => {
    let user_id = req.body.USER_ID
    db.getConnection(
        {
            username: "c##Trial",
            password: "trial",
            connectString: "localhost:1521/ORCLCDB"
        }, async (err, conn) => {
            if (err) {
                console.log('connection failed');
            } else {

                res.render('searchBookForm.ejs',{user_id});
            }
        }
    )
})
app.post('/searchBookshop', (req, res) => {
    let user_id = req.body.USER_ID
    let name = (req.body.searchShop).toUpperCase();
    db.getConnection(
        {
            username: "c##Trial",
            password: "trial",
            connectString: "localhost:1521/ORCLCDB"
        }, async (err, conn) => {
            if (err) {
                console.log('connection failed');
            } else {

                const query = `SELECT * FROM BOOKSHOP WHERE NAME LIKE '%${name}%'`;
                let data = await conn.execute(query);
                let bookshoparray = data.rows;

                const query2 = 'select sum(price) as total_amount from purchase where user_id = :user_id group by user_id'
                const data1 = await conn.execute(query2, [user_id])
                let total_amount;
                if (data1.rows.length == 0) {
                    total_amount = 0
                }
                else total_amount = data1.rows[0].TOTAL_AMOUNT;

                res.render('userpageafterlogin.ejs', { total_amount, user_id, bookshoparray });

            }
        }
    )
})

app.post('/searchBookInfo', (req, res) => {

    const { Name, Genre, Author, minPrice, maxPrice } = req.body;
    let name = Name.toUpperCase(); let genre = Genre.toUpperCase(); let author = Author.toUpperCase();
    let user_id = req.body.USER_ID

    console.log(Name);
    console.log(Genre);
    console.log(minPrice);
    console.log(maxPrice);
    console.log(Author);

    db.getConnection(
        {
            username: "c##Trial",
            password: "trial",
            connectString: "localhost:1521/ORCLCDB"
        }, async (err, conn) => {
            if (err) {
                console.log('connection failed');
            } else {
                //konota na dile form e 
                if (!Name && !Genre && !Author && !maxPrice && !minPrice) {
                    //let shop_id = req.body.SHOP_ID;
                    let query = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) '
                    let data = await conn.execute(query)
                    let bookarray1 = data.rows;

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }

                //only name dile
                else if (Name && !Genre && !Author && !maxPrice && !minPrice)
                {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE P.NAME  LIKE '%${Name}%'`;
                    let data = await conn.execute(query);
                    let bookarray1 = data.rows;
                    console.log(bookarray1.length);

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }
                
                //name ar genre dile
                else if (Name && Genre && !Author && !maxPrice && !minPrice)
                {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE P.NAME LIKE '%${Name}%' AND P.GENRE LIKE '%${Genre}%'` ;
                    let data = await conn.execute(query);
                    let bookarray1 = data.rows;

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }

                //only genre dile
                else if (!Name && Genre && !Author && !maxPrice && !minPrice)
                {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE P.GENRE LIKE '%${Genre}%' `
                    let data = await conn.execute(query);
                    let bookarray1 = data.rows;

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }

                //only author dile
                else if (!Name && !Genre && Author && !maxPrice && !minPrice)
                {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) JOIN AUTHOR A ON(A.AUTHOR_ID = P.AUTHOR_ID) WHERE A.NAME LIKE '%${Author}%' `
                    let data = await conn.execute(query);
                    let bookarray1 = data.rows;

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }

                //name, genre, author dile
                else if (Name && Genre && Author && !maxPrice && !minPrice)
                {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) JOIN AUTHOR A ON(A.AUTHOR_ID = P.AUTHOR_ID) WHERE P.NAME LIKE '%${Name}%' AND P.GENRE LIKE '%${Genre}%' AND A.NAME LIKE '%${Author}%' `
                    let data = await conn.execute(query);
                    let bookarray1 = data.rows;

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }

                //price duita dile
                else if (!Name && !Genre && !Author && maxPrice && minPrice)
                {
                    //Advanced Query
                    let query = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE B.SELLING_PRICE BETWEEN :minPrice AND :maxPrice '
                    let data = await conn.execute(query,[minPrice,maxPrice]);
                    let bookarray1 = data.rows;

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }
                
                //name ar price duita
                else if (Name && !Genre && !Author && maxPrice && minPrice)
                {
                    //Advanced Query
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID)  WHERE P.NAME LIKE '%${Name}%' AND  B.SELLING_PRICE BETWEEN :minPrice AND :maxPrice `
                    let data = await conn.execute(query,[minPrice,maxPrice]);
                    let bookarray1 = data.rows;

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }
                //shob dile
                else if (Name && Genre && Author && maxPrice && minPrice)
                {
                    //Advanced Query
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) JOIN AUTHOR A ON(A.AUTHOR_ID = P.AUTHOR_ID) WHERE P.NAME LIKE '%${Name}%' AND P.GENRE LIKE '%${Genre}%' AND A.NAME LIKE '%${Author}%' AND WHERE B.SELLING_PRICE BETWEEN :minPrice AND :maxPrice  `
                    let data = await conn.execute(query);
                    let bookarray1 = data.rows;

                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                }
                
                // const query = `SELECT * FROM BOOKSHOP WHERE NAME LIKE '%${name}%'`;
                // let data = await conn.execute(query);
                // let bookshoparray = data.rows;

                // const query2 = 'select sum(price) as total_amount from purchase where user_id = :user_id group by user_id'
                // const data1 = await conn.execute(query2, [user_id])
                // let total_amount;
                // if (data1.rows.length == 0) {
                //     total_amount = 0
                // }
                // else total_amount = data1.rows[0].TOTAL_AMOUNT;

                // res.render('UserPageAfterLogin.ejs', { total_amount, user_id, bookshoparray });

            }
        }
    )
})

app.post('/booksinshopwhenSearched', (req, res) => {
    let user_id = req.body.USER_ID
    let book_id = req.body.BOOK_ID
    let shop_id = req.body.SHOP_ID
    let copy_no = req.body.COPY_NO
    console.log(user_id); console.log(user_id); console.log(book_id); console.log(shop_id) ; console.log(copy_no);

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                let q3 = 'SELECT * FROM BUYABLE_SHOP_BOOKS WHERE SHOP_BOOK_ID = :book_id'
                let d3 = await conn.execute(q3, [book_id])
                let newcopies = Number(d3.rows[0].NUMBER_OF_COPIES) - Number(copy_no)
                if (newcopies < 0) {
                    console.log('no more copies')
                } else {
                    let qq = 'SELECT * FROM CART WHERE USER_ID = :user_id'
                    let dd = await conn.execute(qq, [user_id])
                    let cartarray = dd.rows
                    for (let i = 0; i < cartarray.length; i++) {
                        if (cartarray[i].SHOP_ID != shop_id) {
                            res.render('carterror.ejs')
                        }
                    }

                    let q4 = 'UPDATE BUYABLE_SHOP_BOOKS SET NUMBER_OF_COPIES = :newcopies WHERE SHOP_BOOK_ID = :book_id'
                    let d4 = await conn.execute(q4, [newcopies, book_id])

                    conn.commit()

                    let query = 'SELECT * FROM CART WHERE USER_ID = :userID AND SHOP_ID = :shop_id'
                    let data = await conn.execute(query, [user_id, shop_id])
                    if (data.rows.length == 0) {
                        let q1 = 'SELECT MAX(CART_ID) AS LATEST_ID FROM CART'
                        let d1 = await conn.execute(q1)
                        let new_id;
                        if (d1.rows[0].LATEST_ID == null) {
                            new_id = 1;
                        } else new_id = Number(d1.rows[0].LATEST_ID) + 1

                        let total_cost = 0;
                        let discount = 0;

                        let qq = 'INSERT INTO CART(CART_ID,USER_ID,SHOP_ID,TOTAL_COST,DISCOUNT) VALUES(:new_id,:userID,:shop_id,:total_cost,:discount)'
                        let dd = await conn.execute(qq, [new_id, user_id, shop_id, total_cost, discount])
                        conn.commit()
                    }
                    let query5 = 'SELECT * FROM CART WHERE USER_ID = :userID AND SHOP_ID = :shop_id'
                    let data5 = await conn.execute(query5, [user_id, shop_id])

                    console.log("total_cost")
                    console.log(data5.rows[0].TOTAL_COST)
                    console.log(d3.rows[0].SELLING_PRICE)
                    let new_cost = data5.rows[0].TOTAL_COST + copy_no * d3.rows[0].SELLING_PRICE
                    let cart_id = data5.rows[0].CART_ID

                    let query1 = 'UPDATE CART SET TOTAL_COST = :new_cost WHERE USER_ID = :userID AND SHOP_ID = :shop_id'
                    let data1 = await conn.execute(query1, [new_cost, user_id, shop_id])
                    conn.commit()

                    let query2 = 'INSERT INTO CART_BOOKS(CART_ID,BOOK_ID,NUMBER_OF_COPIES) VALUES(:cart_id,:book_id,:copy_no)'
                    try {
                        let data2 = await conn.execute(query2, [cart_id, book_id, copy_no])
                        conn.commit()
                    } catch (e) {
                        console.log(e)
                        let q1 = 'SELECT * FROM CART_BOOKS WHERE CART_ID = :cart_id AND BOOK_ID = :book_id'
                        let d1 = await conn.execute(q1, [cart_id, book_id])

                        let new_copies = Number(d1.rows[0].NUMBER_OF_COPIES) + Number(copy_no)
                        let q2 = 'UPDATE CART_BOOKS SET NUMBER_OF_COPIES=:newcopies WHERE CART_ID = :cart_id AND BOOK_ID = :book_id'
                        let d2 = await conn.execute(q2, [new_copies, cart_id, book_id])
                        conn.commit()

                    }

                    res.render('bookaddedtocart.ejs',{user_id})
                }

            }
        }
    )
})


app.get('/mysuccessfuloffers/:user_id', (req, res) => {
    let user_id = req.params.user_id
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                //let query = 'SELECT B.PUBLISHED_BOOK_ID AS EXCHANGED_BOOK_ID FROM BUYABLE_SHOP_BOOKS B JOIN SUCCESSFUL_EXCHANGE E ON(E.EXCHANGED_BOOK_ID= B.SHOP_BOOK_ID) WHERE E.USER_ID = :user_id'
                let query = 'SELECT EXCHANGED_BOOK_ID FROM SUCCESSFUL_EXCHANGE WHERE USER_ID = :user_id';
                let data = await conn.execute(query, [user_id]);
                let arr = data.rows;

                let offerarray = []; let userInfoarray = [];
                for (let i = 0; i < arr.length; i++) {
                    let exchange_book_id = arr[i].EXCHANGED_BOOK_ID;
                    let query1 = 'SELECT (SELECT P.NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.OFFERED_BOOK_ID )EXCHANGE_NAME,(SELECT C.NAME FROM CUSTOMER C WHERE C.USER_ID=E.USER_ID)USER_NAME FROM SUCCESSFUL_EXCHANGE E WHERE OFFERED_BOOK_ID = :exchange_book_id AND  USER_ID <> :user_id'
                    let data1 = await conn.execute(query1, [exchange_book_id,user_id]);
                    let arr1 = data1.rows;

                    let query2 = 'SELECT (SELECT P.NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.OFFERED_BOOK_ID ) OFFERED_NAME FROM SUCCESSFUL_EXCHANGE E  WHERE EXCHANGED_BOOK_ID = :exchange_book_id AND USER_ID = :user_id ';
                    let data2 = await conn.execute(query2,[exchange_book_id,user_id]);
                    let arr2 =data2.rows;

                    if(arr1.length != 0 ){
                        offerarray.push(arr1);
                        userInfoarray.push(arr2);
                    }
                }

                let query1 = 'SELECT OFFERED_BOOK_ID FROM SUCCESSFUL_EXCHANGE WHERE USER_ID = :user_id';
                let data1 = await conn.execute(query1, [user_id]);
                let arr1 = data1.rows;

                let offerarray1 = []; let userInfoarray1 = [];
                for (let i = 0; i < arr1.length; i++) {
                    let offered_book_id = arr1[i].OFFERED_BOOK_ID;
                    console.log('offered book id: ' + offered_book_id)
                    console.log('user_id ' + user_id);
                    //Advanced Query
                    let query2 = 'SELECT (SELECT P.NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.EXCHANGED_BOOK_ID )OFFERED_NAME,(SELECT C.NAME FROM CUSTOMER C WHERE C.USER_ID=E.USER_ID)USER_NAME FROM SUCCESSFUL_EXCHANGE E WHERE EXCHANGED_BOOK_ID = :offered_book_id AND  USER_ID <> :user_id'
                    let data2 = await conn.execute(query2, [offered_book_id,user_id]);
                    let arr3 = data2.rows;

                    console.log('arr3: ' + arr3.length);

                    let query3 = 'SELECT (SELECT P.NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.EXCHANGED_BOOK_ID ) EXCHANGE_NAME FROM SUCCESSFUL_EXCHANGE E  WHERE OFFERED_BOOK_ID = :offered_book_id AND USER_ID = :user_id ';
                    let data3 = await conn.execute(query3,[offered_book_id,user_id]);
                    let arr4 =data3.rows;

                    if(arr1.length != 0 ){
                        offerarray1.push(arr3);
                        userInfoarray1.push(arr4);
                    }
                }


                res.render('mysuccessfuloffers.ejs', { user_id,offerarray,userInfoarray,offerarray1,userInfoarray1 });
            }
        }
    )
})

app.post('/searchBookstoBorrow/:user_id', (req, res) => {
    let user_id = req.body.USER_ID
    db.getConnection(
        {
            username: "c##Trial",
            password: "trial",
            connectString: "localhost:1521/ORCLCDB"
        }, async (err, conn) => {
            if (err) {
                console.log('connection failed');
            } else {

                res.render('searchBookFormtoBorrow.ejs', { user_id });
            }
        }
    )
})

app.post('/searchBookInfotoBorrow/:user_id', (req, res) => {

    const { Name, Genre, Author } = req.body;
    let name, author, genre;
    if (Name) {
        name = Name.toUpperCase();
    }
    if (Genre) { genre = Genre.toUpperCase(); } if (Author) { author = Author.toUpperCase(); }
    let user_id = req.params.user_id;

    console.log(Name);
    console.log(Genre);
    console.log(Author);

    db.getConnection(
        {
            username: "c##Trial",
            password: "trial",
            connectString: "localhost:1521/ORCLCDB"
        }, async (err, conn) => {
            if (err) {
                console.log('connection failed');
            } else {
                //konota na dile form e 
                if (!Name && !Genre && !Author) {
                    //let shop_id = req.body.SHOP_ID;
                    let query = 'SELECT P.NAME AS NAME, P.GENRE AS GENRE,  B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.PUBLISHED_BOOK_ID AS BOOK_ID  FROM BORROWABLE_LIBRARY_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) '
                    let data = await conn.execute(query)
                    let librarybooks = data.rows;

                    // res.render('booksinlibrarywhenSearched.ejs', { is_member, librarybooks, user_id, library_id })
                    res.render('booksinlibrarywhenSearched.ejs', { librarybooks, user_id })
                }

                //only name dile
                else if (Name && !Genre && !Author) {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.PUBLISHED_BOOK_ID AS BOOK_ID FROM BORROWABLE_LIBRARY_BOOKS  B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE P.NAME  LIKE '%${name}%'`;
                    let data = await conn.execute(query);
                    let librarybooks = data.rows;


                    res.render('booksinlibrarywhenSearched.ejs', { librarybooks, user_id })
                }

                //name ar genre dile
                else if (Name && Genre && !Author && !maxPrice && !minPrice) {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.PUBLISHED_BOOK_ID AS BOOK_ID FROM BORROWABLE_LIBRARY_BOOKS  B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE P.NAME LIKE '%${name}%' AND P.GENRE LIKE '%${genre}%'`;
                    let data = await conn.execute(query);
                    let librarybooks = data.rows;

                    res.render('booksinlibrarywhenSearched.ejs', { librarybooks, user_id })
                }

                //only genre dile
                else if (!Name && Genre && !Author) {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.PUBLISHED_BOOK_ID AS BOOK_ID FROM BORROWABLE_LIBRARY_BOOKS  B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE P.GENRE LIKE '%${genre}%' `
                    let data = await conn.execute(query);
                    let librarybooks = data.rows;

                    res.render('booksinlibrarywhenSearched.ejs', { librarybooks, user_id })
                }

                //only author dile
                else if (!Name && !Genre && Author) {
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE,  B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.PUBLISHED_BOOK_ID AS BOOK_ID FROM BORROWABLE_LIBRARY_BOOKS  B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) JOIN AUTHOR A ON(A.AUTHOR_ID = P.AUTHOR_ID) WHERE A.NAME LIKE '%${author}%' `
                    let data = await conn.execute(query);
                    let librarybooks = data.rows;

                    res.render('booksinlibrarywhenSearched.ejs', { librarybooks, user_id })
                }

                //name, genre, author dile
                else if (Name && Genre && Author) {
                    //Advanced Query
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE,B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.PUBLISHED_BOOK_ID AS BOOK_ID FROM BORROWABLE_LIBRARY_BOOKS  B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) JOIN AUTHOR A ON(A.AUTHOR_ID = P.AUTHOR_ID) WHERE P.NAME LIKE '%${name}%' AND P.GENRE LIKE '%${genre}%' AND A.NAME LIKE '%${author}%' `
                    let data = await conn.execute(query);
                    let librarybooks = data.rows;

                    res.render('booksinlibrarywhenSearched.ejs', { librarybooks, user_id })
                }

                //shob dile
                else if (Name && Genre && Author) {
                    //Advanced Query
                    let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.PUBLISHED_BOOK_ID AS BOOK_ID FROM BORROWABLE_LIBRARY_BOOKS  B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) JOIN AUTHOR A ON(A.AUTHOR_ID = P.AUTHOR_ID) WHERE P.NAME LIKE '%${name}%' AND P.GENRE LIKE '%${genre}%' AND A.NAME LIKE '%${author}%' `
                    let data = await conn.execute(query);
                    let librarybooks = data.rows;

                    res.render('booksinlibrarywhenSearched.ejs', { librarybooks, user_id })
                }
            }
        }
    )
})


app.get('/BooksForExchange/:s_id', (req, res) => {
    let s_id = req.params.s_id;
    console.log('shop id ' + s_id);
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                const query = 'SELECT(SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID  = S.OFFERED_BOOK_ID) AS NAME,(SELECT GENRE FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID  = S.OFFERED_BOOK_ID)AS GENRE FROM SUCCESSFUL_EXCHANGE S JOIN EXCHANGE E ON( E.RETURNED_BOOK_ID = S.OFFERED_BOOK_ID) WHERE S.IS_EXCHANGED = 0 AND E.SHOP_ID = :s_id';
                const data = await conn.execute(query, [s_id]);
                const bookarray = data.rows;
                res.render('BooksForExchange.ejs', { s_id, bookarray });
            }
        }
    )
})
app.get('/publishedbooksforLibrary/:library_id', (req, res) => {
    let library_id = req.params.library_id;
    console.log('library_id pelam kina ' + library_id);
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                const query = 'SELECT B.BOOK_ID AS BOOK_ID ,P.NAME AS PUBLISHER_NAME, B.NAME AS BOOK_NAME,B.GENRE AS GENRE,A.NAME  FROM PUBLISHED_BOOKS B JOIN PUBLISHER P ON( P.PUBLISHER_ID = B.PUBLISHER_ID) JOIN AUTHOR A  ON(A.AUTHOR_ID = B.AUTHOR_ID)';
                const data = await conn.execute(query);
                const bookarray = data.rows;
                res.render('publishedBooksforLibrary.ejs', { library_id, bookarray });
            }
        }
    )
})

app.post('/publishedBookPurchase_library', (req, res) => {
    let library_id = req.body.library_id;
    let number_of_copies = req.body.COPY_NO;
    let book_id = req.body.BOOK_ID;
    console.log(library_id + ' ' + number_of_copies + ' ' + book_id);

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                const a1 = 'select * from borrowable_library_books where LIBRARY_ID = :library_id and published_book_id=:book_id';
                const b1 = await conn.execute(a1, [library_id, book_id]);
                const c1 = b1.rows;
                if (c1.length == 0) {
                    console.log('if');
                    const q1 = 'select MAX(LIBRARY_BOOK_ID) AS LATEST_ID FROM borrowable_library_books';
                    const d1 = await conn.execute(q1);
                    const library_book_id = d1.rows[0].LATEST_ID + 1;
                    let st = 'AVAILABLE';

                    const insertQuery = 'INSERT INTO borrowable_library_books (LIBRARY_BOOK_ID,PUBLISHED_BOOK_ID,LIBRARY_ID,STATUS,NUMBER_OF_COPIES) VALUES(:library_book_id,:book_id,:library_id,:st,:number_of_copies)'
                    try {
                        let data2 = await conn.execute(insertQuery, [library_book_id, book_id, library_id, st, number_of_copies]);
                        conn.commit()
                    } catch (e_) {
                        console.log(e);
                    }
                    console.log('insert korte parlum');
                    const q2 = 'SELECT TOTAL_NO_BOOKS FROM LIBRARY WHERE LIBRARY_ID = :library_id';
                    const d2 = await conn.execute(q2, [library_id]);
                    const total_books = Number(d2.rows[0].TOTAL_NO_BOOKS) + Number(number_of_copies);
                    console.log('total books ' + total_books);

                    const updateQuery = 'UPDATE LIBRARY SET TOTAL_NO_BOOKS = :total_books WHERE LIBRARY_ID = :library_id';
                    const d3 = await conn.execute(updateQuery, [total_books, library_id]);
                    conn.commit();

                    console.log('update holo');
                }
                else {
                    console.log('else');
                    const q2 = 'SELECT TOTAL_NO_BOOKS FROM LIBRARY WHERE LIBRARY_ID = :library_id';
                    const d2 = await conn.execute(q2, [library_id]);
                    const total_books = Number(d2.rows[0].TOTAL_NO_BOOKS) + Number(number_of_copies);
                    console.log('total books in that library ' + total_books);

                    const updateQuery = 'UPDATE LIBRARY SET TOTAL_NO_BOOKS = :total_books WHERE LIBRARY_ID = :library_id';
                    const d3 = await conn.execute(updateQuery, [total_books, library_id]);
                    conn.commit();
                    console.log('update holo2');

                    const q3 = 'select NUMBER_OF_COPIES from borrowable_library_books where LIBRARY_ID = :library_id and published_book_id=:book_id';
                    const p3 = await conn.execute(q3, [library_id, book_id]);
                    const total = Number(p3.rows[0].NUMBER_OF_COPIES) + Number(number_of_copies);
                    console.log('total books ' + total);

                    const updateQuery2 = 'UPDATE borrowable_library_books SET NUMBER_OF_COPIES = :total WHERE LIBRARY_ID = :library_id and published_book_id =:book_id';
                    const d4 = await conn.execute(updateQuery2, [total, library_id, book_id]);
                    conn.commit();
                    console.log('update holo3');
                }
            }
        }
    )
})

app.post('/searchByName/:user_id', (req, res) => {
    let user_id = req.params.user_id;
    let Name = (req.body.Name).toUpperCase();
    db.getConnection(
        {
            username: "c##Trial",
            password: "trial",
            connectString: "localhost:1521/ORCLCDB"
        }, async (err, conn) => {
            if (err) {
                console.log('connection failed');
            } else {
                let query = `SELECT P.NAME AS NAME, P.GENRE AS GENRE, B.SELLING_PRICE AS PRICE, B.NUMBER_OF_COPIES AS NUMBER_OF_COPIES, B.SHOP_BOOK_ID AS BOOK_ID, B.SHOP_ID AS SHOP_ID FROM BUYABLE_SHOP_BOOKS B JOIN PUBLISHED_BOOKS P ON (B.PUBLISHED_BOOK_ID = P.BOOK_ID) WHERE UPPER(P.NAME)  LIKE '%${Name}%'`;
                let data = await conn.execute(query);
                let bookarray1 = data.rows;
                console.log(bookarray1.length);
                if (bookarray1.length != 0) {
                    res.render('booksinshopwhenSearched.ejs', { user_id, bookarray1 });
                    return;
                }
                else {
                    const query = `SELECT * FROM BOOKSHOP WHERE NAME LIKE '%${Name}%'`;
                    let data = await conn.execute(query);
                    let bookshoparray = data.rows;
                    if (bookshoparray.length != 0) {
                        const query2 = 'select sum(price) as total_amount from purchase where user_id = :user_id group by user_id'
                        const data1 = await conn.execute(query2, [user_id])
                        let total_amount;
                        if (data1.rows.length == 0) {
                            total_amount = 0
                        }
                        else total_amount = data1.rows[0].TOTAL_AMOUNT;
                        res.render('shopsWhenSearched.ejs', { total_amount, bookshoparray, user_id });
                        return;
                    }
                    else {
                        const query = `SELECT * FROM LIBRARY WHERE NAME LIKE '%${Name}%'`;
                        let data = await conn.execute(query);
                        let libArray = data.rows;
                        if (libArray.length != 0) {
                            const query3 = 'SELECT * FROM LIBRARY';
                            const librarydata = await conn.execute(query3)
                            const libraryarray = librarydata.rows;
                            res.render('libraryWhenSearched.ejs', { libraryarray, user_id });
                            return;
                        }
                        else {
                            res.render('invalidSearch.ejs');
                        }
                    }
                }

            }
        }
    )
})

app.post('/searchPublishedBooks/:s_id', (req, res) => {
    let s_id = req.params.s_id;
    let Name = (req.body.Name).toUpperCase();
    //let book_id = req.body.BOOK_ID;
    console.log(s_id + ' ' + Name);

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                const query = `SELECT B.BOOK_ID AS BOOK_ID ,P.NAME AS PUBLISHER_NAME, B.NAME AS BOOK_NAME,B.GENRE AS GENRE,A.NAME  FROM PUBLISHED_BOOKS B JOIN PUBLISHER P ON( P.PUBLISHER_ID = B.PUBLISHER_ID) JOIN AUTHOR A  ON(A.AUTHOR_ID = B.AUTHOR_ID) WHERE UPPER(B.NAME)  LIKE '%${Name}%'`;
                const data = await conn.execute(query);
                const bookarray = data.rows;
                if (bookarray.length != 0) {
                    res.render('publishedBooks.ejs', { s_id, bookarray });
                }
                else {
                    res.render('invalidSearch.ejs');
                }
            }
        }
    )
})

app.post('/searchPublishedBooksForLibrary/:library_id', (req, res) => {
    let library_id = req.params.library_id;
    let Name = (req.body.Name).toUpperCase();
    //let book_id = req.body.BOOK_ID;
    console.log(library_id + ' ' + Name);

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                const query = `SELECT B.BOOK_ID AS BOOK_ID ,P.NAME AS PUBLISHER_NAME, B.NAME AS BOOK_NAME,B.GENRE AS GENRE,A.NAME  FROM PUBLISHED_BOOKS B JOIN PUBLISHER P ON( P.PUBLISHER_ID = B.PUBLISHER_ID) JOIN AUTHOR A  ON(A.AUTHOR_ID = B.AUTHOR_ID) WHERE UPPER(B.NAME)  LIKE '%${Name}%'`;
                const data = await conn.execute(query);
                const bookarray = data.rows;
                if (bookarray.length != 0) {
                    res.render('publishedBooksforLibrary.ejs', { library_id, bookarray });
                }
                else {
                    res.render('invalidSearch.ejs');
                }
            }
        }
    )
})


app.get('/publishedBooks/:s_id', (req, res) => {
    let s_id = req.params.s_id;
    console.log('shop id pelam kina ' + s_id);
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                const query = 'SELECT B.BOOK_ID AS BOOK_ID ,P.NAME AS PUBLISHER_NAME, B.NAME AS BOOK_NAME,B.GENRE AS GENRE,A.NAME  FROM PUBLISHED_BOOKS B JOIN PUBLISHER P ON( P.PUBLISHER_ID = B.PUBLISHER_ID) JOIN AUTHOR A  ON(A.AUTHOR_ID = B.AUTHOR_ID)';
                const data = await conn.execute(query);
                const bookarray = data.rows;
                res.render('publishedBooks.ejs', { s_id, bookarray });
            }
        }
    )
})

app.post('/publishedBookPurchase', (req, res) => {
    let shop_id = req.body.SHOP_ID;
    let number_of_copies = req.body.COPY_NO;
    let book_id = req.body.BOOK_ID;
    console.log(shop_id + ' ' + number_of_copies + ' ' + book_id);


    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                const a1 = 'select * from buyable_shop_books where SHOP_ID = :shop_id and published_book_id=:book_id';
                const b1 = await conn.execute(a1, [shop_id, book_id]);
                const c1 = b1.rows;
                if (c1.length == 0) {
                    const q1 = 'select MAX(SHOP_BOOK_ID) AS LATEST_ID FROM BUYABLE_SHOP_BOOKS';
                    const d1 = await conn.execute(q1);
                    const shop_book_id = d1.rows[0].LATEST_ID + 1;

                    const insertQuery = 'INSERT INTO BUYABLE_SHOP_BOOKS (SHOP_BOOK_ID,SHOP_ID,PUBLISHED_BOOK_ID,NUMBER_OF_COPIES) VALUES(:shop_book_id,:shop_id,:book_id,:number_of_copies)'
                    try {
                        let data2 = await conn.execute(insertQuery, [shop_book_id, shop_id, book_id, number_of_copies]);
                        conn.commit()
                    } catch (e_) {
                        console.log(e);
                    }
                    console.log('insert korte parlum');
                    const q2 = 'SELECT TOTAL_NUMBER_OF_BOOKS FROM BOOKSHOP WHERE SHOP_ID = :shop_id';
                    const d2 = await conn.execute(q2, [shop_id]);
                    const total_books = Number(d2.rows[0].TOTAL_NUMBER_OF_BOOKS) + Number(number_of_copies);
                    console.log('total books ' + total_books);

                    const updateQuery = 'UPDATE BOOKSHOP SET TOTAL_NUMBER_OF_BOOKS = :total_books WHERE SHOP_ID = :shop_id';
                    const d3 = await conn.execute(updateQuery, [total_books, shop_id]);
                    conn.commit();

                    console.log('update holo');

                    //res.render('PublisherPageAfterLogin.ejs', { publisher_id, publishedbooks })
                }
                else {
                    const q2 = 'SELECT TOTAL_NUMBER_OF_BOOKS FROM BOOKSHOP WHERE SHOP_ID = :shop_id';
                    const d2 = await conn.execute(q2, [shop_id]);
                    const total_books = Number(d2.rows[0].TOTAL_NUMBER_OF_BOOKS) + Number(number_of_copies);
                    console.log('total books in that shop ' + total_books);

                    const updateQuery = 'UPDATE BOOKSHOP SET TOTAL_NUMBER_OF_BOOKS = :total_books WHERE SHOP_ID = :shop_id';
                    const d3 = await conn.execute(updateQuery, [total_books, shop_id]);
                    conn.commit();
                    console.log('update holo2');

                    const q3 = 'select NUMBER_OF_COPIES from buyable_shop_books where SHOP_ID = :shop_id and published_book_id=:book_id';
                    const p3 = await conn.execute(q3, [shop_id, book_id]);
                    const total = Number(p3.rows[0].NUMBER_OF_COPIES) + Number(number_of_copies);
                    console.log('total books ' + total);

                    const updateQuery2 = 'UPDATE buyable_shop_books SET NUMBER_OF_COPIES = :total WHERE SHOP_ID = :shop_id and published_book_id =:book_id';
                    const d4 = await conn.execute(updateQuery2, [total, shop_id, book_id]);
                    conn.commit();
                    console.log('update holo3');
                }

            }
        }
    )
})

app.get('/publisherlogin', (req, res) => {
    res.render('publisherlogin.ejs')
})

app.post('/publisherlogin', (req, res) => {
    let name = req.body.NAME.toUpperCase();
    let password = req.body.PASSWORD

    console.log(name + ' ' + password);
    db.getConnection(
        {
            username: 'C##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                const q = 'select PUBLISHER_ID from PUBLISHER where UPPER(name) = :name';
                const d = await conn.execute(q, [name])
                //console.log(name)
                //console.log(d.rows)
                let publisher_id = d.rows[0].PUBLISHER_ID;
                console.log(publisher_id);

                const query = 'select * from PUBLISHER where PUBLISHER_ID = :publisher_id'

                const ldata = await conn.execute(query, [publisher_id])
                const array = ldata.rows;

                if (array.length == 0) res.render('invalidpassid.ejs')
                else {
                    if (password != array[0].PASSWORD) res.render('invalidpassid.ejs')

                    else {
                        const q1 = 'SELECT * from PUBLISHED_BOOKS WHERE PUBLISHER_ID = :publisher_id'
                        const d1 = await conn.execute(q1, [publisher_id])
                        const publishedbooks = d1.rows;
                        res.render('PublisherPageAfterLogin.ejs', { publisher_id, publishedbooks })
                    }
                }
            }

        })
}
)

app.get('/publisherpageafterlogin/:publisher_id', (req, res) => {
    let publisher_id = req.params.publisher_id;
    db.getConnection(
        {
            username: 'C##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {

                const query = 'select * from PUBLISHER where PUBLISHER_ID = :publisher_id'

                const ldata = await conn.execute(query, [publisher_id])
                const array = ldata.rows;

                //if (array.length == 0) res.render('invalidpassid.ejs')
                // else {
                //if(password != libraryarray[0].PASSWORD) res.render('invalidpassid.ejs')

                //else{
                const q1 = 'SELECT * from PUBLISHED_BOOKS WHERE PUBLISHER_ID = :publisher_id'
                const d1 = await conn.execute(q1, [publisher_id])
                const publishedbooks = d1.rows;
                res.render('PublisherPageAfterLogin.ejs', { publisher_id, publishedbooks })

                //}
            }

        })
})


app.get('/addPublishedBooks/:publisher_id', (req, res) => {
    let publisher_id = req.params.publisher_id;
    console.log(publisher_id);
    res.render('addpublishedbook.ejs', { publisher_id });
})

app.post('/addPublishedBooksform', (req, res) => {
    let publisher_id = req.body.publisher_id;
    let isbn = req.body.ISBN
    let name = req.body.NAME
    let genre = req.body.GENRE
    let locked = req.body.LOCKED;
    let number_of_copies = req.body.NUMBER_OF_COPIES;
    let author_id = req.body.AUTHOR_ID;
    let rating;
    console.log(publisher_id + ' ' + isbn + ' ' + name + ' ' + genre + ' ' + locked + ' ' + number_of_copies + ' ' + author_id + ' ' + rating);

    db.getConnection(
        {
            username: 'C##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                let qq = 'SELECT MAX(BOOK_ID) AS LATEST_ID FROM PUBLISHED_BOOKS'
                let dd = await conn.execute(qq);
                let book_id = dd.rows[0].LATEST_ID + 1;
                console.log(book_id);

                let query = 'INSERT INTO PUBLISHED_BOOKS(BOOK_ID,PUBLISHER_ID,ISBN,NAME,GENRE,LOCKED,COPIES_PUBLISHED,AUTHOR_ID) VALUES(:book_id,:publisher_id,:isbn,:name,:genre,:locked,:number_of_copies,:author_id)'

                try {
                    let data = await conn.execute(query, [book_id, publisher_id, isbn, name, genre, locked, number_of_copies, author_id])
                    conn.commit()
                    book_id++;
                } catch (e) {
                    console.log(book_id);
                    console.log('book already exists')
                }


                const q1 = 'SELECT * from PUBLISHED_BOOKS WHERE PUBLISHER_ID = :publisher_id'
                const d1 = await conn.execute(q1, [publisher_id])
                const publishedbooks = d1.rows;
                res.render('PublisherPageAfterLogin.ejs', { publisher_id, publishedbooks })

            }
        }
    )
})


app.get('/updatebook/:s_id', (req, res) => {
    res.render('updatebook.ejs')
})

app.post('/updatebook', (req, res) => {
    let isbn = req.body.ISBN;
    let price = req.body.PRICE;

    db.getConnection(
        {
            username: 'C##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                let q = 'SELECT * FROM BUYABLE_BOOKS WHERE ISBN = :isbn'
                const bdata = await conn.execute(q, [isbn])
                const array = bdata.rows

                if (array.length == 0) res.render('invalidisbn.ejs')
                else {
                    let query = 'UPDATE BUYABLE_BOOKS SET PRICE= :price WHERE ISBN = :isbn'
                    const data = await conn.execute(query, [price, isbn])
                    conn.commit()

                    const query1 = 'select * from bookshop where shop_id = :id'

                    const shopdata = await conn.execute(query1, [id])
                    const shoparray = shopdata.rows;
                    let s_id = id;

                    const query2 = 'select * from buyable_books where shop_id = :id'
                    const bookdata = await conn.execute(query2, [id])
                    const bookarray = bookdata.rows
                    res.render('ShopPageAfterLogin.ejs', { shoparray, bookarray,s_id })
                }

            }
        }
    )
})


app.get('/exchangeOffersForShop/:s_id', (req, res) => {
    let s_id = req.params.s_id;
    console.log(s_id);
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err)
            else {
                console.log('print'); console.log(id);
                /*let q1 = 'SELECT B.PUBLISHED_BOOK_ID AS EXCHANGED_BOOK_ID FROM EXCHANGE E JOIN BUYABLE_SHOP_BOOKS B  ON(E.EXCHANGED_BOOK_ID = B.SHOP_BOOK_ID) WHERE E.SHOP_ID = :id';
                let d1 = await conn.execute(q1, [id]);
                let a1 = d1.rows;*/

                /* let offerarrayShop = [];
                 for (let i = 0; i < a1.length; i++) {
                     let exchanged_book_id = a1.EXCHANGED_BOOK_ID;
                     let query = 'SELECT DISTINCT E.EXCHANGE_ID AS EXCHANGE_ID , E. PROFIT AS PROFIT, C.USER_ID AS USER_ID,C.EMAIL AS EMAIL, C.NAME AS USER_NAME,B.NAME AS SHOP_NAME, (SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.RETURNED_BOOK_ID ) AS OFFERED_BOOK_NAME ,(SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = :exchanged_book_id ) AS EXCHANGED_BOOK_NAME,E.EXCHANGED_BOOK_PRICE,E.OFFERED_BOOK_REAL_PRICE FROM EXCHANGE E JOIN BOOKSHOP B ON (E.SHOP_ID = B.SHOP_ID) JOIN BUYABLE_SHOP_BOOKS S ON (S.SHOP_ID = B.SHOP_ID) JOIN CUSTOMER C ON(C.USER_ID=E.USER_ID)  WHERE E.SHOP_ID = :shopID';
                     let data = await conn.execute(query, [exchanged_book_id,id]);
                     console.log(id);
                     let arrayShop = data.rows;
                     //console.log(offerarrayShop.length);
                     if(arrayShop.length != 0 )
                     {
                         offerarrayShop.push(arrayShop);
                     }
                 }*/
                //let query = 'SELECT DISTINCT E.EXCHANGE_ID AS EXCHANGE_ID , E. PROFIT AS PROFIT, C.USER_ID AS USER_ID,C.EMAIL AS EMAIL, C.NAME AS USER_NAME,B.NAME AS SHOP_NAME, (SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.RETURNED_BOOK_ID ) AS OFFERED_BOOK_NAME ,(SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.EXCHANGED_BOOK_ID ) AS EXCHANGED_BOOK_NAME,E.EXCHANGED_BOOK_PRICE,E.OFFERED_BOOK_REAL_PRICE FROM EXCHANGE E JOIN BOOKSHOP B ON (E.SHOP_ID = B.SHOP_ID) JOIN BUYABLE_SHOP_BOOKS S ON (S.SHOP_ID = B.SHOP_ID) JOIN CUSTOMER C ON(C.USER_ID=E.USER_ID)  WHERE E.SHOP_ID = :shopID';
                //Advanced Query
                let query = 'SELECT DISTINCT E.EXCHANGE_ID AS EXCHANGE_ID , E. PROFIT AS PROFIT, C.USER_ID AS USER_ID,C.EMAIL AS EMAIL, C.NAME AS USER_NAME,B.NAME AS SHOP_NAME, (SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = E.RETURNED_BOOK_ID ) AS OFFERED_BOOK_NAME ,(SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = S.PUBLISHED_BOOK_ID ) AS EXCHANGED_BOOK_NAME,E.EXCHANGED_BOOK_PRICE,E.OFFERED_BOOK_REAL_PRICE, E.CONDITION AS CONDITION FROM EXCHANGE E JOIN BOOKSHOP B ON (E.SHOP_ID = B.SHOP_ID) JOIN BUYABLE_SHOP_BOOKS S ON (E.EXCHANGED_BOOK_ID = S.SHOP_BOOK_ID) JOIN CUSTOMER C ON(C.USER_ID=E.USER_ID)  WHERE E.SHOP_ID = :shopID';
                let data = await conn.execute(query, [id]);
                console.log(id);
                let offerarrayShop = data.rows;
                console.log(offerarrayShop.length);

                res.render('exchangeOffersForShop.ejs', { offerarrayShop });
            }
        }
    )
})


app.get('/userTouser/:user_id', (req, res) => {

    let user_id = req.params.user_id;

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err);
            else {
                let q1 = ' SELECT DISTINCT C.USER_ID AS U_ID,C.NAME AS U_NAME, C.EMAIL AS U_EMAIL ,(SELECT NAME FROM PUBLISHED_BOOKS WHERE BOOK_ID = U.BOOK_ID) BOOK_NAME FROM CUSTOMER C JOIN USER_COLLECTION U ON(C.USER_ID = U.USER_ID) WHERE C.USER_ID <> :user_id'
                let d1 = await conn.execute(q1, [user_id]);
                let users = d1.rows;
                res.render('showUsers.ejs', { user_id, users });

            }
        }
    )
});

app.post('/exchangeOfferTouser/:user_id', (req, res) => {
    let user_id = req.params.user_id; //////je offer kortese
    let user2 = req.body.USER_ID2; //jake offer kortese 
    console.log(user_id + ' ' + user2);

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err);
            else {
                let q1 = 'SELECT (SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = U.BOOK_ID) AS NAME FROM USER_COLLECTION U WHERE USER_ID = :user_id';
                let d1 = await conn.execute(q1, [user_id])
                let firstuserbooks = d1.rows;

                console.log(firstuserbooks.length);

                let q2 = 'SELECT (SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = U.BOOK_ID) AS NAME FROM USER_COLLECTION U WHERE USER_ID = :user2';
                let d2 = await conn.execute(q2, [user2])
                let seconduserbooks = d2.rows;

                console.log(seconduserbooks.length);

                res.render('exchangeFormForUser.ejs', { user_id, user2, firstuserbooks, seconduserbooks });
            }
        }
    )
});


app.post('/exchangewithUser/:user_id/:user2', (req, res) => {
    let user_id = req.params.user_id; //////je offer kortese
    let user2 = req.params.user2; //jake offer kortese 
    console.log(user_id + ' ' + user2);

    let condition = req.body.condition;
    let e_name = req.body.ExchangedBookName;
    let o_name = req.body.OfferedBookName;
    let status = 0;
    console.log(condition);
    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err);
            else {
                let q1 = "SELECT BOOK_ID AS OFFERED_BOOK_ID FROM PUBLISHED_BOOKS WHERE NAME=:o_name ";
                let d1 = await conn.execute(q1, [o_name])
                let offered_book_id = d1.rows[0].OFFERED_BOOK_ID;
                console.log('return book id paisi : ' + offered_book_id);

                let q2 = "SELECT BOOK_ID AS OFFERED_BOOK_ID FROM PUBLISHED_BOOKS WHERE NAME=:e_name ";
                let d2 = await conn.execute(q2, [e_name])
                let exchanged_book_id = d2.rows[0].OFFERED_BOOK_ID;
                console.log('exchanged_book_id paisi : ' + exchanged_book_id);

                let check = 'select * from USER_EXCHANGE WHERE U_FROM = :usr_id and U_TO =:user2 and OFFERED_BOOK_ID= :offered_book_id and EXCHANGED_BOOK_ID =:exchanged_book_id';
                let cData = await conn.execute(check, [user_id, user2, offered_book_id, exchanged_book_id]);
                let arr = cData.rows;
                if (arr.length == 0) {
                    let insertQuery = 'INSERT INTO USER_EXCHANGE(U_FROM,U_TO,OFFERED_BOOK_ID,EXCHANGED_BOOK_ID,STATUS,CONDITION) VALUES(:user_id,:user2,:offered_book_id,:exchanged_book_id,:status,:condition)';
                    let insertData = await conn.execute(insertQuery, [user_id, user2, offered_book_id, exchanged_book_id, status, condition]);
                    conn.commit();
                    console.log('insert hoise');
                    //successful alert msg 
                }
                else {
                    //alert msg de je same offer abar kortese
                }
            }
        }
    )
});


app.get('/userOffers/:user_id', (req, res) => {
    let user_id = req.params.user_id;     
    console.log(user_id )

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err);
            else {
                //let q1 = 'SELECT * FROM USER_EXCHANGE WHERE U_FROM = :user_id'; 
                let q1 = 'SELECT (SELECT NAME FROM CUSTOMER C WHERE C.USER_ID = U.U_TO ) NAME,(SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = U.EXCHANGED_BOOK_ID) AS E_NAME, (SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = U.OFFERED_BOOK_ID) AS O_NAME,U.STATUS AS STATUS FROM  USER_EXCHANGE U WHERE U_FROM = :user_id'
                let d1 = await conn.execute(q1, [user_id])
                let arr1 = d1.rows;

                let q2 = 'SELECT (SELECT NAME FROM CUSTOMER C WHERE C.USER_ID = U.U_FROM ) NAME,U.U_FROM AS U_FROM, (SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = U.EXCHANGED_BOOK_ID) AS E_NAME,U.EXCHANGED_BOOK_ID as EXCHANGED_BOOK_ID ,U.OFFERED_BOOK_ID as OFFERED_BOOK_ID,(SELECT NAME FROM PUBLISHED_BOOKS P WHERE P.BOOK_ID = U.OFFERED_BOOK_ID) AS O_NAME, U.STATUS AS STATUS,U.CONDITION AS CONDITION FROM  USER_EXCHANGE U WHERE U_TO = :user_id'; 
                let d2 = await conn.execute(q2, [user_id])
                let arr2 = d2.rows;

                res.render('showUserTouserOffers.ejs',{arr1,arr2,user_id});
            }
        }
    )
});

//declineuserOffer

app.post('/declineuserOffer/:user_id', (req, res) => {
    let user_id = req.params.user_id;  
    let user2 = req.body.USER_ID2;  
  
    let st = -1;

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err);
            else {
                let query = 'UPDATE USER_EXCHANGE SET STATUS =:st WHERE U_FROM =:user2 and U_TO = :user_id AND EXCHANGED_BOOK_ID = :E_ID and OFFERED_BOOK_ID =:O_ID';
                let data = await conn.execute(query, [st, user2,user_id,E_ID,O_ID]);
                conn.commit();
            }
        }
    )
});


app.post('/acceptuserOffer/:user_id', (req, res) => {
    let user_id = req.params.user_id;  
    let user2 = req.body.USER_ID2;  
    let E_ID = req.body.E_ID;
    let O_ID = req.body.O_ID;  
    console.log(user_id+' '+user2+' '+E_ID+ ' '+O_ID );
    let st = 1;

    db.getConnection(
        {
            username: 'c##Trial',
            password: 'trial',
            connectString: 'localhost:1521/ORCLCDB'
        }, async (err, conn) => {
            if (err) console.log(err);
            else {
                let query = 'UPDATE USER_EXCHANGE SET STATUS =:st WHERE U_FROM =:user2 and U_TO = :user_id AND EXCHANGED_BOOK_ID = :E_ID and OFFERED_BOOK_ID =:O_ID';
                let data = await conn.execute(query, [st, user2,user_id,E_ID,O_ID]);
                conn.commit();

                let q1='SELECT * from USER_COLLECTION WHERE USER_ID = :user_id AND BOOK_ID = :E_ID'
                let d1 = await conn.execute(q1, [user_id,E_ID]);
                let a1= d1.rows;
                if(a1.length == 0)
                {
                    let copy = 1;
                    let i1='insert INTO USER_COLLECTION (:user_id,:E_ID,:copy)'
                    let d = await conn.execute(i1, [user_id,E_ID,copy]);
                    conn.commit();
                }
                else{
                    let copy =Number(a1[0].COPIES )+1;
                    let u1='update USER_COLLECTION set COPIES =:copy WHERE USER_ID =:user_id AND BOOK_ID = :E_ID'
                    let d1 = await conn.execute(u1, [copy,user_id,E_ID]);
                    conn.commit();
                }

                let q2='SELECT * from USER_COLLECTION WHERE USER_ID = :user_id AND BOOK_ID = :O_ID'
                let d2 = await conn.execute(q1, [user_id,O_ID]);
                let a2= d2.rows;
                let c=Number(a2[0].COPIES) - 1;
                let u2='update USER_COLLECTION set COPIES =:c WHERE USER_ID =:user_id AND BOOK_ID = :O_ID'
                let e2 = await conn.execute(u2, [c,user_id,O_ID]);
                    conn.commit();
                
            }
        }
    )
});

