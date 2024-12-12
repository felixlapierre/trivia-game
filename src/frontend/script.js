function login() {
    var username = document.getElementById("input-username").value;
    var password = document.getElementById("input-password").value
    console.log("Login as " + username)
    const request = new Request('/api/login', {
        "method": "POST",
        "body": {
            username,
            password
        }
    })
    fetch(request).then((response) => {
        if (response.status == 200) {
            const token = response.json
            document.cookie = `token=${token}`
        } else {
            alert("Wrong username/password dipshit");
        }
    })
}

function render() {
    if (!document.cookie.includes("token")){
        renderLogin()
    } else {
        renderMainPage()
    }
}

function renderLogin() {
    document.getElementById("root").innerHTML = `
    <div class="container is-fluid">
        <div class="control">
            <input id="input-username" class="input submit-box is-large" type="text" placeholder="Username">
            <input id="input-password" class="input submit-box is-large" type="password" placeholder="Password">
            <button class="button is-primary submit-button" onclick="login()">Login</button>
        </div>
    </div>
    `
}

function renderMainPage() {
    document.getElementById("root").innerHTML = `
  <div id="header">
    felix (100pts)
  </div>
  <div class="container is-fluid">
      <div class="control">
        <input class="input submit-box is-large" type="text" placeholder="Enter your answer">
      </div>
      <div>
        <button class="button is-primary submit-button">Submit</button>
      </div>
  </div>
    `
}

function getToken() {
    return document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];
}

render()

fetch("/api/hello").then((response) => {
    response.json().then((body) => {
        console.log(body.message)
    })
})