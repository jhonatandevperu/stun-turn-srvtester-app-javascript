"use strict";

//Autor's URL of JS function: https://stackoverflow.com/a/57003981
function checkTurnOrStun(turnConfig, timeout) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      if (promiseResolved) {
        if (promiseResolved == "STUN") resolve("STUN");
        return;
      }
      resolve(false);
      promiseResolved = true;
    }, timeout || 5000);

    var promiseResolved = false,
      myPeerConnection =
        window.RTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.webkitRTCPeerConnection, //compatibility for firefox and chrome
      pc = new myPeerConnection({ iceServers: [turnConfig] }),
      noop = function() {};
    pc.createDataChannel(""); //create a bogus data channel
    pc.createOffer(function(sdp) {
      if (sdp.sdp.indexOf("typ relay") > -1) {
        // sometimes sdp contains the ice candidates...
        promiseResolved = "TURN";
        resolve(true);
      }
      pc.setLocalDescription(sdp, noop, noop);
    }, noop); // create offer and set local description
    pc.onicecandidate = function(ice) {
      //listen for candidate events
      if (!ice || !ice.candidate || !ice.candidate.candidate) return;
      if (ice.candidate.candidate.indexOf("typ relay") != -1) {
        promiseResolved = "TURN";
        resolve("TURN");
      } else if (
        !promiseResolved &&
        (ice.candidate.candidate.indexOf("typ prflx") != -1 ||
          ice.candidate.candidate.indexOf("typ srflx") != -1)
      ) {
        promiseResolved = "STUN";
        if (turnConfig.url.indexOf("turn:") !== 0) resolve("STUN");
      } else return;
    };
  });
}

$(document).ready(function() {
  $("#form").submit(function(e) {
    e.preventDefault();
    e.stopPropagation();
  });

  $("#form")
    .parsley()
    .on("form:success", function(e) {
      $("#form #btnSubmit").prop("disabled", true);
      var info = {};
      for (var i = 0; i < e.fields.length; i++) {
        info[e.fields[i].element.name] =
          e.fields[i].element.name == "timeout"
            ? Number(e.fields[i].value)
            : e.fields[i].value;
      }

      checkTurnOrStun(
        info.usuario != "" && info.password != ""
          ? {
              url: `${info.tipo_servidor}:${info.host}:${info.puerto}?transport=${info.protocolo}`,
              credential: info.password,
              username: info.usuario
            }
          : {
              url: `${info.tipo_servidor}:${info.host}:${info.puerto}?transport=${info.protocolo}`
            },
        info.timeout
      )
        .then(function(resultado) {
          if (resultado) {
            $("#success").html("<div class='alert alert-success'>");
            $("#success > .alert-success")
              .html(
                "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;"
              )
              .append("</button>");
            $("#success > .alert-success").append(
              `<strong>El servidor ${resultado}, se encuentra activo!</strong>`
            );
            $("#success > .alert-success").append("</div>");
          } else {
            $("#success").html("<div class='alert alert-danger'>");
            $("#success > .alert-danger")
              .html(
                "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;"
              )
              .append("</button>");
            $("#success > .alert-danger").append(
              $("<strong>").text(`El servidor, NO se encuentra activo.`)
            );
            $("#success > .alert-danger").append("</div>");
          }
          $("#form").trigger("reset");
          $("#form")
            .parsley()
            .reset();
          setTimeout(function() {
            $("#form #btnSubmit").prop("disabled", false);
          }, 1000);
        })
        .catch(function(error) {
          console.error(error);
        });
    });
});
