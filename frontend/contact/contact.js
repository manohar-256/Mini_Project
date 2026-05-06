document.addEventListener("DOMContentLoaded", () => {
    const routes = window.APP_ROUTES || {};

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
       
            window.location.href = routes.login || "/login";
        }

    });

    document.querySelector(".home")?.addEventListener("click", () => {
        window.location.href = routes.home || "/";
    });

    document.querySelector(".about")?.addEventListener("click", () => {
        window.location.href = routes.about || "/about";
    });

    document.querySelector(".con")?.addEventListener("click", () => {
        window.location.href = routes.contact || "/contact";
    });

      
    document.querySelector(".contact-btn")?.addEventListener("click", (event) => {
        if (!event.currentTarget.getAttribute("href")) {
            event.preventDefault();
            window.location.href = routes.contactForm || "/contact/form";
        }
    });
     

});
