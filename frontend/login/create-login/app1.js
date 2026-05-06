document.addEventListener("DOMContentLoaded",()=>{
    const routes = window.APP_ROUTES || {};
    const user=document.querySelector(".user");
    const name=document.querySelector(".name");
    const pass=document.querySelector(".pass");
    const msg=document.querySelector(".msg");
    const msg1=document.querySelector(".msg1");
    const msg2=document.querySelector(".msg2");
    const btn1=document.querySelector(".btn1");
    const eye = document.querySelector(".toggle-eye");
    const toggleIcon = document.querySelector(".togglePassword");

          toggleIcon.addEventListener("click", () => {

    
    if (pass.type === "password") {
      pass.type = "text";          
      toggleIcon.classList.add("fa-eye-slash");
      toggleIcon.classList.remove("fa-eye");
    } 

    else {
      pass.type = "password";      
      toggleIcon.classList.add("fa-eye");
      toggleIcon.classList.remove("fa-eye-slash");
    }

  });


  btn1.addEventListener("click",()=>{
     const na=name.value.trim();
    const us=user.value.trim();
     const ps=pass.value.trim();



      msg.textContent = "";
    msg1.textContent = "";
    msg2.textContent = "";

    msg1.classList.remove("error-glow");
    msg.classList.remove("error-glow");
     msg2.classList.remove("error-glow");


     if(us==="" || ps===""|| na===""){
            msg.textContent = "All fields are required";
            msg.classList.add("error-glow");
            msg.style.fontSize="0.75rem";
            msg.style.color="red";
            msg.style.textAlign="center";
            msg.classList.add("error-glow");
            return;
        }


         let users = JSON.parse(localStorage.getItem("users")) || [];
         const userExists = users.some(u => u.username === us);
        
        
         if (userExists) {
        msg2.textContent = "User already exists";
         msg2.style.fontSize="0.75rem";
          msg2.style.color="red";
           msg2.style.textAlign="center";
        msg2.classList.add("error-glow");
        return;
    }

 
    users.push({
        username: us,
        password: ps
    });


    localStorage.setItem("users", JSON.stringify(users));

    msg2.textContent = "Account created successfully";
    msg2.style.color = "green";
       msg2.style.textAlign="center";
        msg2.classList.add("error-glow");
        msg2.style.fontSize="0.75rem";


            
setTimeout(() => {
    window.location.href = routes.login || "/login";
}, 2000);


});

    
  });
