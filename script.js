document.querySelector("form").addEventListener("submit", async function(e) {
    e.preventDefault();

    const data = {
        name: this[0].value,
        email: this[1].value,
        message: this[2].value
    };

    try {
        const response = await fetch("http://127.0.0.1:5000/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        alert(result.message);
        this.reset();
    } catch (err) {
        alert("Failed to send message. Try again later.");
        console.error(err);
    }
});