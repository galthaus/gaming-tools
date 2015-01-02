'use strict';

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
   return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * @ngdoc overview
 * @name wildWestCharSheetApp
 * @description
 * # wildWestCharSheetApp
 *
 * Main module of the application.
 */
angular.module('wildWestCharSheetApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function ($locationProvider, $routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: '/views/main.html',
        controller: 'MainCtrl'
      })
      .when('/ledger', {
        templateUrl: '/views/ledger.html',
        controller: 'LedgerCtrl'
      })
      .when('/skills', {
        templateUrl: '/views/skills.html',
        controller: 'SkillsCtrl'
      })
      .when('/feats', {
        templateUrl: '/views/feats.html',
        controller: 'FeatsCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });

angular.module('wildWestCharSheetApp').factory('dataService', [ '$q', '$resource', '$rootScope', function($q, $resource, $rootScope) {
  var items=0;
  var character=0;
  var service={};

  service.getItems=function() {
    var itemsDefer=$q.defer();
    if (typeof items !== 'number') {
      itemsDefer.resolve(items);
    } else {
      $.ajax({
        url: "/game-data.json",
        mimeType: "application/json",
        dataType: 'json',
        data: null,
        success: function( data ) {
          var d = new Date();
          items=data;
          items.current_date = d.getFullYear() + "/" + (d.getMonth()+1) + "/" + d.getDate();
          if (typeof items !== 'number' && typeof character !== 'number' && character.dynamic_sheet !== null)
            ledger_calculate(items, character);
          itemsDefer.resolve(items);
        },
        error: function(jq, reason, error) {
          alert(reason + "::" + error);
        }
      });
    }
    return itemsDefer.promise;
  };

  service.getCharacter=function() {
    var itemsDefer=$q.defer();
    if (typeof character !== 'number') {
      itemsDefer.resolve(character);
    } else {
      $.ajax({
        url: global_character_id + ".json",
        mimeType: "application/json",
        dataType: 'json',
        data: null,
        success: function( data ) {
          character=data;
          if (character.dynamic_sheet === null) {
            $.ajax({
              url: "/character-base.json",
              mimeType: "application/json",
              dataType: 'json',
              data: null,
              success: function( data ) {
                character.dynamic_sheet=data;
                if (typeof items !== 'number' && typeof character !== 'number')
                  ledger_calculate(items, character);
                itemsDefer.resolve(character);
              },
              error: function(jq, reason, error) {
                alert(reason + "::" + error);
              }
            });
          }
          else {
            if (typeof items !== 'number' && typeof character !== 'number')
              ledger_calculate(items, character);
            itemsDefer.resolve(character);
          }
        },
        error: function(jq, reason, error) {
          alert(reason + "::" + error);
        }
      });
    }
    return itemsDefer.promise;
  };

  service.setCharacter=function(data) {
    character = data;
    $rootScope.$broadcast('dataService:character',data);
    if (typeof items !== 'number' && typeof character !== 'number')
      ledger_calculate(items, character);
  };

  service.saveCharacter=function() {
    var data = {};
    data.data = character;
    $.ajax({
      type: "PUT",
      url: "/characters/" + global_character_id + ".json",
      data: JSON.stringify(data),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      success: function(msg) {
        alert(msg.d);
      },
      error: function(msg) {
        alert('error');
      }
    });
  };

  return service;
}]);

function calculate(gameData, character) {
  for (var i = 0; i < gameData.calculations.length; i++) {
    var v = gameData.calculations[i].value;
    var e = gameData.calculations[i].eval;

    eval(v + " = " + e);
  }
    
  var cc = findLedgerTypeEntry(gameData.classes, character.dynamic_sheet.ci.base.current_class);
  for (var i = 0; i < gameData.skills.length; i++) {
    var dskill = gameData.skills[i];
    var cskill = character.dynamic_sheet.ci.skills[dskill.name];
    
    if (cskill === undefined) {
      character.dynamic_sheet.ci.skills[dskill.name] = {
        "tmp_mod": 0,
        "extra_mod": 0,
        "total": 0,
        "ranks": 0,
        "attr_mod": 0
      };
      cskill = character.dynamic_sheet.ci.skills[dskill.name];
    }
    
    if (cskill.tmp_mod === undefined) {
      cskill.tmp_mod = 0;
    }
    cskill.extra_mod = 0;
    if (($.inArray(dskill.name, character.dynamic_sheet.ci.base.permanentSkills) !== -1) &&
        cc !== undefined && ($.inArray(dskill.name, cc.ClassSkills) !== -1)) {
      cskill.extra_mod = 1;
    }

    if (dskill.attribute === "None") {
      cskill.attr_mod = 0;    
    }
    else {
      cskill.attr_mod = character.dynamic_sheet.ci.attributes[dskill.attribute].mod;
    }
    cskill.total = cskill.ranks + cskill.attr_mod + cskill.extra_mod + Number(cskill.tmp_mod);
  }
}