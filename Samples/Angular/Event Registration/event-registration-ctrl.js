angular.module('ima-web-client')
  .controller('EventRegistrationCtrl', ['$scope', '$routeParams', '$http', 'url', 'arrayHelper', 'pageData', '$sce', '$location', '$timeout',
    function ($scope, $routeParams, $http, $url, $array, pageData, $sce, $location, $timeout) {
        $scope.data = {};
        $scope.selectedTeamMember = '';
        $scope.teamMemberList = [$scope.selectedTeamMember];
        $scope.eventDates;
        $scope.meta = {};
        $scope.loaded = false;
        $scope.defaultValues = {};
        $scope.defaultArray = [];
        $scope.invalidEstimate = false;

        //INIT
        window.scroll(0, 0);

        /* GETTER || SETTER METHODS */
        $scope.isLoaded = function () {
            return $scope.loaded;
        }
        $scope.calendar = {
            dob: { opened: false }
        };

        //SAMPLE DATA
        $scope.sampleWaves = [
            { Name: 'Sample Wave 1', Id: 1 },
            { Name: 'Sample Wave Two', Id: 2 },
            { Name: 'Third Sample Wave', Id: 3 }
        ];

        $scope.sampleWave = $scope.sampleWaves[0];
        $scope.association = [];
        //END SAMPLE DATA 

        $scope.updateEditReg = function (cq) {
            var temp = ((!!cq.Answer.wholeNumber) ? cq.Answer.wholeNumber : "0") + "." + ((!!cq.Answer.fraction) ? cq.Answer.fraction : "0");
            cq.Answer.Value = temp;
        }

        $scope.showEndDate = function () {
            if (!$scope.data.Model || !$scope.data.Model.EventEndDate) {
                return false;
            }

            if (!$scope.eventDates) {
                $scope.eventDates = {
                    begin: new Date($scope.data.Model.EventStartDate),
                    end: new Date($scope.data.Model.EventEndDate),
                };
            }

            return $scope.eventDates.end > $scope.eventDates.begin;
        }


        $scope.openCalendar = function (id) {
            if (!this.calendar.hasOwnProperty(id)) {
                this.calendar[id] = {};
            }
            this.calendar[id].opened = true;
        }


        $scope.changeTime = function () {
        }

        $scope.updateCheck = function (cq, answer) {
            if (cq.Answer.checked) {
                cq.Answer.Value = answer;
            } else {
                cq.Answer.Value = '';
            }
        }

        $scope.convertToInt = function (data) {
            data.SelectedWaveId = parseInt(data.SelectedWaveId);
        }

        $scope.selectTeam = function (data) {
            if (data.Resources.OpenTeams._selected) {
                data.Model.TeamId = parseInt(data.Resources.OpenTeams._selected.Id);
                data.Model.TeamName = data.Resources.OpenTeams._selected.Name;
            }
            else {
                data.Model.TeamId = 0;
                data.Model.TeamName = "";
            }
        }

        $scope.editTeamMember = function (selectedId) {
            if (selectedId !== $routeParams.id && selectedId) {
                $location.path('/event/registration/' + $routeParams.id + '/' + selectedId);
            } else {
                $location.path('/event/registration/' + $routeParams.id);
            }

        }

        $scope.IsCharityRequired = function () {

            var data = $scope.data.Model.CustomQuestions;
            var IsRquired = false;

            angular.forEach(data, function (value, key) {
                if (value.TypeToken === "charity" && value.Required === true) {
                    IsRquired = true;
                }
            });
            return IsRquired;
        }

        $scope.getWaveLabel = function (wave) {
            if (($scope.data.selectedWave && $scope.data.selectedWave.WaveID !== wave.WaveID) && wave.WaveLimit > 0 && wave.WaveLimit > wave.WaveCount && wave.WaveShowAfterCount > 0) {
                return wave.WaveName + ' (' + (wave.WaveLimit - wave.WaveCount) + ' spots left)';
            } else if (wave.WaveCount >= wave.WaveLimit && wave.WaveLimit != 0) {
                return wave.WaveName + ' (SOLD OUT)';
            }
            else {
                return wave.WaveName;
            }
        }

        var path = '/registration?regId=' + $routeParams.id;
        $scope.personalRegId = $routeParams.id;
        if ($routeParams.id && $routeParams.teamMemberId) {
            path += '&teamMemberRegId=' + $routeParams.teamMemberId;
            $scope.personalRegId = $routeParams.teamMemberId;
        }

        var checkTime = function (form, value, index, array) {
            if (value.TypeToken !== 'longtime' && value.TypeToken !== 'time') { return false; }

            if (value.TypeToken === 'longtime' && value.Answer && value.Answer.Value && value.Answer.Value.toString().indexOf('00:00:00') > -1 && value.Required) {
                form['cq_' + value.Id].$error.required = true;
                return value;
            }
            if (value.TypeToken === 'time' && value.Answer && value.Answer.Value && value.Answer.Value.toString().indexOf('00:00') > -1 && value.Required) {
                form['cq_' + value.Id].$error.required = true;
                return value;
            }
        }

        $http.get($url.api(path), {}).then(function successCallback(response) {
            $scope.data = JSON.parse(JSON.parse(response.data));
            $scope.data.selectedCategory = $array.findInArray($scope.data.Resources.ClassCategories, 'Id', $scope.data.Model.ParticipantCategoryId);
            $scope.meta.permissions = $scope.data.Permissions;

            if ($scope.data.Resources.Settings.ShowWaves) {
                $scope.data.selectedWave = $array.findInArray($scope.data.Resources.Waves, 'WaveID', $scope.data.Model.SelectedWaveId);
            }

            if ($scope.data.Model.DateOfBirth) {
                $scope.data.Model.DateOfBirth = new Date($scope.data.Model.DateOfBirth);
            }

            if ($scope.data && $scope.data.Resources && $scope.data.Resources.TeamMembers) {
                $scope.teamMemberList = $scope.data.Resources.TeamMembers;
                $scope.selectedTeamMember = ($routeParams.teamMemberId != null) ? $routeParams.teamMemberId : $routeParams.id;
            }

            if ($scope.data && $scope.data.Model && $scope.data.Model.TeamId) {
                if ($scope.data.Resources && $scope.data.Resources.OpenTeams) {
                    var selectedTeam = $scope.data.Resources.OpenTeams.find(function (team) { return team.Id === $scope.data.Model.TeamId });
                    if (selectedTeam) {
                        $scope.data.Resources.OpenTeams._selected = selectedTeam;
                    }
                }
            }

            if ($scope.data.Settings && $scope.data.Settings.ShowExtended) {
                pageData.getCountryList().then(function (countryList) {
                    $scope.data.Model.countryList = countryList;
                    $scope.data.selectedCountry = $array.findInArray($scope.data.countryList, 'id', $scope.data.CountryId);
                    pageData.getStateList($scope.data.CountryId).then(function (stateList) {
                        $scope.data.stateList = stateList;
                        $scope.data.selectedState = $array.findInArray($scope.data.stateList, 'id', $scope.data.StateId);
                        $scope.loaded = true;
                    });
                })
            } else {
                $scope.loaded = true;
            }
            if ($scope.data.Resources.association && $scope.data.Resources.Settings.ShowAssociationInfo) {
                $scope.associationName = $scope.data.Resources.association.AssociationAbbrev;
                $scope.associationName += $scope.data.Resources.association.PackageName == '' ? '' : ' - ' + $scope.data.Resources.association.PackageName;
                $scope.association.MemberID = $scope.data.Resources.association.MemberID;
                if ($scope.data.Resources.association.MemberStatusID !== 1) {
                    if ($scope.data.Resources.association.MemberID === '') {
                        $scope.association.MemberID = ' processing';
                    }
                }
            }


        }, function errorCallback(response) {
            console.log('Error retrieving search results');
        });

        $scope.goBack = function (priorRoute) {
            if (!priorRoute) {
                priorRoute = document.location.origin;
            }
            document.location = priorRoute;
        }

        $scope.invalidEstimatedFinish = function () {
            return $scope.invalidEstimate;
        }

        $scope.load = function (participantId) {
            $location.path('/event/registration/' + participantId);
        }

        $scope.preSaveValidate = function () {
            if ($scope.data.Model.CustomQuestions) {
                $scope.data.Model.CustomQuestions.forEach(function (cq) {
                    if (!cq.Required
                        && (cq.TypeToken === 'date' || cq.TypeToken === 'time' || cq.TypeToken === 'longtime')
                        && (Object.prototype.toString.call(cq.Answer.Value) === "[object Date]") && isNaN(cq.Answer.Value.getTime())) {
                        cq.Answer.Value = $scope.defaultValues[cq.Id];
                        $scope.defaultArray.push(cq.Id);
                    }
                });
            }

            $('form[name="editRegForm"]')[0].checkValidity();
        }

        $scope.save = function (form) {

            $scope.preSaveValidate();

            $timeout(function () {
                $scope.saveReg(form);
            }, 200);


        }

        $scope.saveReg = function (form) {
            if ($scope.data.selectedCategory && $scope.data.selectedCategory.Id) {
                $scope.data.Model.ParticipantCategoryId = $scope.data.selectedCategory.Id;
            }

            var postData = angular.copy($scope.data);

            var errors = false;
            if (postData.Model.CustomQuestions && postData.Model.CustomQuestions.filter(checkTime.bind(null, form)).length > 0) {
                errors = true;
            }
            if ($scope.data.Model.ExpectedFinishTime) {
                $scope.invalidEstimate = false;
                var time = new Date($scope.data.Model.ExpectedFinishTime);
                if (time.getHours() === 0 && time.getMinutes() === 0 && time.getSeconds() === 0) {
                    $scope.invalidEstimate = true;
                    errors = true;
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }
            }

            if (!form.$valid) {
                form.$submitted = true;
                errors = true;
            }
            if (errors) {
                form.$submitted = true;
                debugger;
                var elemt = document.querySelector('.validation-label-error');
                var estimatedFinishError = document.querySelector('.form-group-error') ? document.querySelector('.form-group-error') : document.querySelector('.form-group-error-add');
                var invalidEmail = document.querySelector('.invalid-email-label');

                if (elemt != null) {
                    elemt.scrollIntoView();
                    window.scrollBy(0, -83);
                }
                else if (invalidEmail != null) {
                    invalidEmail.scrollIntoView();
                    window.scrollBy(0, -83);
                }
                else if (estimatedFinishError != null) {
                    estimatedFinishError.scrollIntoView();
                    window.scrollBy(0, -83);
                }

                return false;
            }

            if (postData.Model.ExpectedFinishTime) {
                var formatDate = new Date(postData.Model.ExpectedFinishTime.toLocaleString());
                var offset = formatDate.getTimezoneOffset();
                formatDate.setMinutes(formatDate.getMinutes() - offset);
                postData.Model.ExpectedFinishTime = formatDate;
            }

            if (postData.Model.CustomQuestions) {
                for (var i = 0, j = $scope.defaultArray.length; i < j ; i++) {
                    postData.Model.CustomQuestions.forEach(function (cq) {
                        if ($scope.defaultArray[i] === cq.Id) {
                            cq.Answer.Value = '';
                        }
                    });
                }

                postData.Model.CustomQuestions.forEach(function (item) {
                    if (item.TypeToken && item.TypeToken === 'state' && item.Answer && item.Answer.Value && item.Answer.Value.name) {
                        var stateName = item.Answer.Value.name;
                        item.Answer.Value = stateName;
                    }
                    if (item.TypeToken && item.TypeToken === 'time' && item.Answer && item.Answer.Value) {
                        var minutes = item.Answer.Value.getMinutes();
                        var seconds = item.Answer.Value.getSeconds();
                        item.Answer.Value = minutes + ':' + seconds;
                    }
                    if (item.TypeToken && item.TypeToken === 'longtime' && item.Answer && item.Answer.Value) {
                        var hours = item.Answer.Value.getHours();
                        var minutes = item.Answer.Value.getMinutes();
                        var seconds = item.Answer.Value.getSeconds();
                        item.Answer.Value = hours + ':' + minutes + ':' + seconds;
                    }
                    if (item.Answer && !item.Answer.Value) {
                        item.Answer.Value = '';
                    }

                });
            }

            var url = $url.api('/registration');
            url += '?regId=' + (($routeParams.teamMemberId) ? $routeParams.teamMemberId : $routeParams.id);
            $http.post(url, postData.Model).then(function successCallback(response) {
                $scope.goBack($scope.priorRoute);
            }, function errorCallback(response) {
                //fail
            });
        }

        $scope.showPersonalInfo = function () {
            if (($scope.data.Resources.ClassCategories && $scope.data.Resources.ClassCategories.length > 0 && $scope.meta.permissions.ParticipantCategoryId && $scope.meta.permissions.ParticipantCategoryId.Allowed && $scope.data.Resources.Settings.ShowCategory)
             || ($scope.data.Resources.Settings.ShowTeam && ($scope.meta.permissions.TeamId && $scope.meta.permissions.TeamId.Allowed))
             || ($scope.data.Resources.Settings.ShowAssociationInfo && $scope.association.iAssociationPackageID > 0)
             || (($scope.meta.permissions.ExpectedFinishTime && $scope.meta.permissions.ExpectedFinishTime.Allowed) && $scope.data.Resources.Settings.ShowFinishTime)
             || (($scope.meta.permissions.DateOfBirth && $scope.meta.permissions.DateOfBirth.Allowed) && $scope.data.Resources.Settings.ShowDateOfBirth)
             || ($scope.data.Resources.Settings.ShowEmergencyContact && ($scope.meta.permissions.EmergencyContactName && $scope.meta.permissions.EmergencyContactName.Allowed))
             || ($scope.data.Resources.Settings.ShowEmergencyContact && ($scope.meta.permissions.EmergencyContactPhone && $scope.meta.permissions.EmergencyContactPhone.Allowed))
             || (($scope.data.Resources.Settings.ShowWaves || $scope.data.Resources.Settings.ShowCustomQuestionWithLimits) && $scope.meta.permissions.SelectedWaveId.Allowed)
             || (($scope.meta.permissions.MedicalInfo && $scope.meta.permissions.MedicalInfo.Allowed) && $scope.data.Resources.Settings.ShowMedicalInfo)) {
                return true;
            }
            return false;
        }

    }

  ]);