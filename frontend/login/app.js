document.addEventListener("DOMContentLoaded", () => {

const user = document.querySelector(".user");
const pass = document.querySelector(".pass");
const msg = document.querySelector(".msg");
const msg2 = document.querySelector(".msg2");
const btn = document.querySelector(".btn");
const btn1 = document.querySelector(".btn1");
const toggleIcon = document.querySelector(".togglePassword");

toggleIcon.addEventListener("click", () => {
    pass.type = pass.type === "password" ? "text" : "password";
});

btn.addEventListener("click", () => {

    const us = user.value.trim();
    const ps = pass.value.trim();

    msg.textContent="";
    msg2.textContent="";

    if(us === "" || ps === ""){
        msg.textContent = "Username or password cannot be empty";
        msg.style.color="red";
        msg.style.textAlign="center";
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];

    if(users.length === 0){
        msg2.textContent = "No account found. Create one first.";
        msg2.style.color="red";
        msg2.style.textAlign="center";
        return;
    }

    const existingUser = users.find(u => u.username === us);

    if(!existingUser){
        msg2.textContent = "User not found.";
        msg2.style.color="red";
        msg2.style.textAlign="center";
        return;
    }

    if(existingUser.password !== ps){
        msg2.textContent = "Incorrect password";
        msg2.style.color="red";
        msg2.style.textAlign="center";
        return;
    }


    localStorage.setItem("loggedInUser", us);

    msg2.textContent = "Login successful";
    msg2.style.color="green";
    msg2.style.textAlign="center";

    setTimeout(()=>{
        window.location.href = "../home/index.html";
    },1000);

});

btn1.addEventListener("click",()=>{
    window.location.href="create-login/index1.html";
});

});
