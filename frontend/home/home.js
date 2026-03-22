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
       
            window.location.href = "../login/login.html";
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



    document.querySelector(".primary-btn")?.addEventListener("click", () => {

        let loggedUser = localStorage.getItem("loggedInUser");

        if(!loggedUser){
            alert("Please login first");
            window.location.href = "../login/login.html";
            return;
        }
        setTimeout(()=>{
                    window.location.href = "../chat/chat.html";
        },2000);

    });

});