const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))

const triggerTabList = document.querySelectorAll('#menuTab button')
triggerTabList.forEach(triggerEl => {
  const tabTrigger = new bootstrap.Tab(triggerEl)

  triggerEl.addEventListener('click', event => {
    event.preventDefault()
    tabTrigger.show()
  })
});

var pageContent = document.getElementById("page-content");
var error = document.getElementById("error");

if(botOwner) {
    document.getElementById("reboot").addEventListener("click",async(event)=>{
        if(!(await makeApiRequest("/api/reboot"))) return;
        await reloadSeconds(20);
    });
    document.getElementById("redeploy").addEventListener("click",async(event)=>{
        if(!(await makeApiRequest("/api/redeploy"))) return;
        await reloadSeconds(20);
    });
    document.getElementById("pullnpm").addEventListener("click",async(event)=>{
        if(!(await makeApiRequest("/api/pullnpm"))) return;
        await reloadSeconds(30);
    });
    document.getElementById("pull").addEventListener("click",async(event)=>{
        if(!(await makeApiRequest("/api/pull"))) return;
        await reloadSeconds(30);
    });
    document.getElementById("npm").addEventListener("click",async(event)=>{
        if(!(await makeApiRequest("/api/npm"))) return;
        await reloadSeconds(30);
    });
}

async function makeApiRequest(url) {
    try {
        var result = await fetch(url);
        if(result.redirected) {
            window.location.href = result.url;
            return false;
        }
        if(!result.ok) throw new Error(`HTTP error code ${result.status}`)
    } catch(err) {
        error.innerHTML = `An error occurred when performing that action:<br>${err}`;
        error.classList.add("show");
        await new Promise(resolve=>setTimeout(resolve,15000));
        error.classList.remove("show");
        return false;
    }
    return true;
}

async function reloadSeconds(secondsLeft) {
    popoverList.forEach(o=>o.hide());
    error.classList.remove("show");
    while(secondsLeft >= 0) {
        pageContent.innerHTML = `Rebooting/stopping bot... Page will reload automatically in ${secondsLeft} seconds.`;
        secondsLeft--;
        await new Promise(resolve=>setTimeout(resolve,1000));
    }
    location.reload();
}