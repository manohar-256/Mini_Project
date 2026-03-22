document.addEventListener("DOMContentLoaded", () => {

const form = document.getElementById("feedbackForm");

const name = document.getElementById("name");
const email = document.getElementById("email");
const phone = document.getElementById("num");
const subject = document.getElementById("sub");
const message = document.getElementById("msg");

form.addEventListener("submit", (e) => {

    e.preventDefault(); 

    const userName = name.value.trim();
    const userEmail = email.value.trim();
    const userPhone = phone.value.trim();
    const userSubject = subject.value.trim();
    const userMessage = message.value.trim();

    if(userName === "" || userEmail === "" || userPhone === "" || userSubject === "" || userMessage === ""){
        alert("Please fill all fields");
        return;
    }

    if(userPhone.length < 10){
        alert("Enter a valid phone number");
        return;
    }

    alert("Feedback submitted successfully!");

    window.location.href="../contact/contact.html";

});
});
  
