(function() {
  'use strict';

  angular
    .module('core')
    .controller('LoginController', LoginController);

  LoginController.$inject = ['$scope', '$state', '$rootScope', 'AuthenticationService', 'AUTHORISED_EMAIL', 'MESSAGES', '$mdDialog', 'Notification'];

  function LoginController($scope, $state, $rootScope, AuthenticationService, AUTHORISED_EMAIL, MESSAGES, $mdDialog, Notification) {
    //var vm = this;
    var isSigninInProgress = false;

    var loggedIn = $rootScope.globals.currentUser;
    var page = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
    var currentPage = page ? page : 'login';
    if (loggedIn) {
      var routePage = currentPage === 'login' ? 'bookings' : currentPage;
      
      var allStates = _.map($state.get(), 'name');
      $state.go(_.includes(allStates, routePage) ? routePage : 'bookings');
      $rootScope.isUserLoggedIn = true;
    } else {
      $rootScope.isUserLoggedIn = false;
    }



    /*(function initController() {
         // reset login status
         AuthenticationService.ClearCredentials();
      })();*/

    $scope.handleAuthClick = function(event) {
      isSigninInProgress = false;
      //gapi.auth.authorize({discoveryDocs: GOOGLE_DISCOVERY_DOCS, client_id: GOOGLE_CLIENT_ID, scope: GOOGLE_SCOPES, immediate: true}, handleAuthResult);
      //return false;        

      // Listen for sign-in state changes.
      gapi.auth2.getAuthInstance().isSignedIn.listen($scope.updateSigninStatus);

      // Handle the initial sign-in state.
      var isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
      $scope.updateSigninStatus(isSignedIn);

      if(!isSignedIn) {
        gapi.auth2.getAuthInstance().signIn();
      }      
    }

    $scope.updateSigninStatus = function(isSignedIn) {
      if (isSigninInProgress) {
        return
      }

      if (isSignedIn) {
          isSigninInProgress = true;
          console.log("signed in");
          var profile = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();

          if (profile.getEmail() !== null) {
            if (profile.getEmail().toLowerCase() == AUTHORISED_EMAIL) {
              $state.go('bookings');
              AuthenticationService.SetCredentials("", profile.getEmail(), profile.getId(), profile.getName(), profile.getImageUrl());

              Notification.success({
                message: MESSAGES.SUCCESS_MSG_AUTH,
                title: '<i class="glyphicon glyphicon-remove"></i> ' + MESSAGES.SUCCESS_TITLE_AUTH
              });

              $rootScope.isUserLoggedIn = true;
              $rootScope.$broadcast('userLoggedIn'); //sending broadcast to update the header name and image                    
            } else {
              $mdDialog.show($mdDialog.alert().clickOutsideToClose(true).title(MESSAGES.ERR_MSG_UNAUTHORISED_USER).ok('OK'));
              setTimeout(function() {
                gapi.auth2.getAuthInstance().disconnect();
              }, 1000);

            }
          } else {
            console.log("null");
            $mdDialog.show($mdDialog.alert().clickOutsideToClose(true).title(MESSAGES.ERR_MSG_PRIMARY_EMAIL).ok('OK'));
          }
      } else {
        console.log("not signed in");
      }
    }

  }
}());
