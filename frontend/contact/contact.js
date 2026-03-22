document.addEventListener("DOMContentLoaded", () => {

      const loginBtn = document.getElementById("btn1");


    let loggedUser = localStorage.getItem("loggedInUser");

    if(loggedUser){
        loginBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Logout';
    } else {
        loginBtn.innerHTML = '<i class="fa-solid fa-user-graduate"></i> Log in';
    }



    loginBtn.addEventListener("click", () => {

        let loggedUser = localStorage.getItem("loggedInUser");

        if(loggedUser){
    
            localStorage.removeItem("loggedInUser");
            alert("Logged out successfully");

            loginBtn.innerHTML = '<i class="fa-solid fa-user-graduate"></i> Log in';
        } else {
       
            window.location.href = "../login/index.html";
        }

    });

    document.querySelector(".home")?.addEventListener("click", () => {
        window.location.href = "../home/index.html";
    });

    document.querySelector(".about")?.addEventListener("click", () => {
        window.location.href = "../about/about.html";
    });

    document.querySelector(".con")?.addEventListener("click", () => {
        window.location.href = "../contact/contact.html";
    });

    
    document.getElementById("btn1")?.addEventListener("click", () => {
        window.location.href = "../login/login.html";
    });

      
    setTimeout(()=>{
        document.querySelector(".contact-btn")?.addEventListener("click", () => {
        window.location.href = "../contact-form/contact-form.html";
    });

    },2000);
     

});