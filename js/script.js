"use strict";

//Autor's URL of checkTurnOrStun function: https://stackoverflow.com/a/34033938
const checkTurnOrStun = (turnConfig, timeout) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (promiseResolved) return;
      resolve(false);
      promiseResolved = true;
    }, timeout || 5000);

    var promiseResolved = false,
      myPeerConnection =
        window.RTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.webkitRTCPeerConnection, //compatibility for firefox and chrome
      pc = new myPeerConnection({ iceServers: [turnConfig] }),
      noop = () => {};
    pc.createDataChannel(""); //create a bogus data channel
    pc.createOffer(sdp => {
      if (sdp.sdp.indexOf("typ relay") > -1) {
        // sometimes sdp contains the ice candidates...
        promiseResolved = true;
        resolve(true);
      }
      pc.setLocalDescription(sdp, noop, noop);
    }, noop); // create offer and set local description
    pc.onicecandidate = ice => {
      //listen for candidate events
      if (
        promiseResolved ||
        !ice ||
        !ice.candidate ||
        !ice.candidate.candidate ||
        !(ice.candidate.candidate.indexOf("typ relay") > -1)
      )
        return;
      promiseResolved = true;
      resolve(true);
    };
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    e.stopPropagation();
  });

  $("#form")
    .parsley()
    .on("form:success", async e => {
      form.querySelector("#btnSubmit").disabled = true;
      const info = {};
      for (let i = 0; i < e.fields.length; i++) {
        info[e.fields[i].element.name] =
          e.fields[i].element.name == "timeout"
            ? Number(e.fields[i].value)
            : e.fields[i].value;
      }
      try {
        let success = await checkTurnOrStun(
          String(info.usuario).trim().length > 0 &&
            String(info.password).trim().length > 0
            ? {
                urls: `${info.tipo_servidor}:${info.host}:${info.puerto}?transport=${info.protocolo}`,
                username: info.usuario,
                credential: info.password
              }
            : {
                url: `${info.tipo_servidor}:${info.host}:${info.puerto}?transport=${info.protocolo}`
              },
          info.timeout
        );
        if (success) {
          const divSuccess = document.createElement("div");
          divSuccess.className = "alert alert-success";
          divSuccess.innerHTML = `<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;  </button><strong>El servidor ${String(
            info.tipo_servidor
          ).toUpperCase()}, se encuentra activo!</strong>`;
          form.querySelector("#success").appendChild(divSuccess);
        } else {
          const divError = document.createElement("div");
          divError.className = "alert alert-danger";
          divError.innerHTML = `<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button> <strong>El servidor ${String(
            info.tipo_servidor
          ).toUpperCase()}, NO se encuentra activo.</strong>`;
          form.querySelector("#success").appendChild(divError);
        }
      } catch (error) {
        console.error(error);
        const divError = document.createElement("div");
        divError.className = "alert alert-danger";
        divError.innerHTML = `<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button> <strong>Al fue mal. Error: ${error} </strong>`;
        form.querySelector("#success").appendChild(divError);
      } finally {
        form.reset();
        $("#form")
          .parsley()
          .reset();
        setTimeout(() => {
          form.querySelector("#btnSubmit").disabled = false;
        }, 1000);
      }
    });
});
