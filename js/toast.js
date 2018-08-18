/**
 * @author https://github.com/AlexKvazos/VanillaToasts/blob/master/vanillatoasts.js
 */


(function(root, factory) {
  try {
    // commonjs
    if (typeof exports === 'object') {
      module.exports = factory();
    // global
    } else {
      root.Toast = factory();
    }
  } catch(error) {
    console.log('Isomorphic compatibility is not supported at this time for Toast.')
  }
})(this, function() {

  // We need DOM to be ready
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init);
  }

  // Create Toast object
  Toast = {
    // In case toast creation is attempted before dom has finished loading!
    create: function() {
      console.error([
        'DOM has not finished loading.',
        '\tInvoke create method when DOM\s readyState is complete'
      ].join('\n'))
    },
    //function to manually set timeout after create
    setTimeout: function() {
      console.error([
        'DOM has not finished loading.',
        '\tInvoke create method when DOM\s readyState is complete'
      ].join('\n'))
    },
    toasts: {} //store toasts to modify later
  };
  var autoincrement = 0;

  // Initialize library
  function init() {
    // Toast container
    var container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    // @Override
    // Replace create method when DOM has finished loading
    Toast.create = function(options) {
      var toast = document.createElement('div');
      toast.id = ++autoincrement;
      toast.id = 'toast-' + toast.id;
      toast.className = 'toast';

      // title
      if (options.title) {
        var h4 = document.createElement('h4');
        h4.className = 'toast-title';
        h4.innerHTML = options.title;
        toast.appendChild(h4);
      }

      // text
      if (options.text) {
        var p = document.createElement('p');
        p.className = 'toast-text';
        p.innerHTML = options.text;
        toast.appendChild(p);
      }

      // icon
      if (options.icon) {
        var img = document.createElement('img');
        img.src = options.icon;
        img.className = 'toast-icon';
        toast.appendChild(img);
      }

      // button
      if (options.button) {
        var button = document.createElement('button');
        button.className = 'toast-button';
        button.innerHTML = options.button;
        toast.appendChild(button);
      }

      // click callback
      if (typeof options.callback === 'function') {
        toast.addEventListener('click', options.callback);
      }

      // toast api
      toast.hide = function() {
        toast.className += ' toast-fadeout';
        toast.addEventListener('animationend', removeToast, false);
      };

      // autohide
      if (options.timeout) {
        setTimeout(toast.hide, options.timeout);
      }

      if (options.type) {
        toast.className += ' toast-' + options.type;
      }

      toast.addEventListener('click', toast.hide);


      function removeToast() {
        document.getElementById('toast-container').removeChild(toast);
        delete Toast.toasts[toast.id];  //remove toast from object
      }

      document.getElementById('toast-container').appendChild(toast);

      //add toast to object so its easily gettable by its id
      Toast.toasts[toast.id] = toast;

      return toast;
    }

    /*
    custom function to manually initiate timeout of
    the toast.  Useful if toast is created as persistant
    because we don't want it to start to timeout until
    we tell it to
    */
    Toast.setTimeout = function(toastid, val) {
      if(Toast.toasts[toastid]){
        setTimeout(Toast.toasts[toastid].hide, val);
      }
    }
  }

  return Toast;

});