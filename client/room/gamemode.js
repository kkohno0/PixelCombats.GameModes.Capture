import { Map, AreaService, AreaViewService, AreaPlayerTriggerService, Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import { DisplayValueHeader, Color } from 'pixel_combats/basic';
import * as teams from './default_teams.js';

// настройки констант
const WaitingPlayersTime = 10;
const BuildBaseTime = 60;
const GameModeTime = 300;
const def_points = GameModeTime * 0.2;
const EndOfMatchTime = 10;
const DefPointsMaxCount = 30;
const DefTimerTickInderval = 1;
const SavePointsCount = 10;
const RepairPointsBySecond = 0.5;
const capture_points = 10;		
const MAX_CAPTURE_POINTS = 15;	
const RedCaptureW = 1;		
const BlueCaptureW = 2;		
const CaptureRestoreW = 1;	
const BLUE_COLOR = new Color(0, 0, 1, 0);
const WHITE_COLOR = new Color(1, 1, 1, 0); 
const RED_COLOR = new Color(1, 0, 0, 0);
const MAX_SPAWNS_BY_AREA = 25;	

const IMMORTALITY_TIMER_NAME = 'Immortality';
const scores_prop_name = 'Scores';
const kills_prop_name = 'Kills';
const WINNERS_SCORES = 50;
const TIMER_SCORES = 5;
const KILL_SCORES = 30;
const INTERVAL_TIMER_SCORES = 100;

// имена используемых объектов, и для подсказок
const WaitingStateValue = "Waiting";
const BuildModeStateValue = "BuildMode";
const GameStateValue = "Game";
const EndOfMatchStateValue = "EndOfMatch";
const DefAreaTag = "def";
const CaptureAreaTag = "capture";
const HoldPositionHint = "GameModeHint/HoldPosition";
const RunToBliePointHint = "GameModeHint/RunToBliePoint";
const DefBlueAreaHint = "GameModeHint/DefBlueArea";
const DefThisAreaHint = "GameModeHint/DefThisArea";
const WaitingForBlueBuildHint = "GameModeHint/WaitingForBlueBuild";
const ChangeTeamHint = "GameModeHint/ChangeTeam";
const YourAreaIsCapturing = "GameModeHint/YourAreaIsCapturing";
const PrepareToDefBlueArea = "GameModeHint/PrepareToDefBlueArea";

// получаем соответствующие объекты режима, с которыми работает данный режим
const mainTimer = Timers.GetContext().Get("Main");
const scores_timer = Timers.GetContext().Get("Scores");
const DEF_TICK_TIMER = Timers.getContext().Get("DefTimer");
const stateProp = Properties.GetContext().Get("State");
const capturedAreaIndexProp = Properties.GetContext().Get("RedCaptiredIndex");
const def_areas = AreaService.GetByTag(DefAreaTag);
const capture_areas = AreaService.GetByTag(CaptureAreaTag);
let capture_triggers = [];
let capture_views = [];
let capture_properties = [];

// цвет всем зонам для захвата
Map.OnLoad.Add(function () {
	InitializeDefAreas();
});

function InitializeDefAreas() {
 def_areas = AreaService.GetByTag(DefAreaTag);
 capture_areas = AreaService.GetByTag(CaptureAreaTag);
// ограничитель зон по захвату
 if (capture_areas == null) return;
 if (capture_areas.length == 0) return;
	 capture_triggers = [];
	 capture_views = [];
	 capture_properties = [];
// сортировка зон по цвету
 capture_areas.sort(function (a, b) {
if (a.Name > b.Name) return 1;
if (a.Name < b.Name) return -1;
   return 0;
 });
// инициализация переменных объектов
 for (const i = 0; i < capture_areas.length; ++i) {
 // создаем обыкновенный визулизатор
 const VIEW = AreaViewService.GetContext().Get(capture_areas[i].Name + "VIEW");
capture_views.push(VIEW);
// создаем триггер зоны по захвату
 const TRIGGER = AreaPlayerTriggerService.Get(capture_areas[i].Name + "TRIGGER");
capture_triggers.push(TRIGGER);
// создаем свойство для захвата зон, по их именам объектов используемых в режимах
const capture_prop = Properties.GetContext().Get(capture_areas[i].Name + "Property");
 capture_prop.OnValue.Add(CapturePropOnValue);
   capture_properties.push(capture_prop);
    }
}
InitializeDefAreas();
function LogTrigger(player, trigger) {
 log.debug("вошли в " + trigger);
}
function CapturePropOnValue(prop) {
// берем индекс из объектов констант, и переводим в зоны
 const capture_index = -1;
for (const i = 0; i < capture_properties.length; ++i)
  if (capture_properties[i] == capture_prop) {
capture_index = i;
 break;
}
// отмачаем зону захваченой/незахваченой используя краски визуализатор по данным объектов
 if (capture_prop.Value >= capture_points) CaptureArea(capture_index);
 else {
// красим в изначальную закраску зоны
const DROD = capture_prop.Value / MAX_CAPTURE_POINTS;
 if (capture_index >= 0) {
capture_views[capture_index].Color = {
  r: (WHITE_COLOR.r - BLUE_COLOR.r) * DROD + BLUE_COLOR.r,
g: (WHITE_COLOR.g - BLUE_COLOR.g) * DROD + BLUE_COLOR.g,
  b: (WHITE.b - BLUE_COLOR.b) * DROD + BLUE_COLOR.b
};
	}
// снятие захвата с зон, при помощи краски визулизатора зон
 UN_CAPTURE_AREA(capture_index);
}
// задаем индекс захваченой зоны красными
  SET_SPAWN_INDEX();
  }
// отмечает зону захваченой красными при помощи, визулизатора зон
function CAPTURE_AREA(capture_index) {
if (capture_index < 0 || capture_index >= capture_areas.length) return;
 capture_views[capture_index].Color = RED_COLOR;
   if (capture_index < capture_properties.length - 1)
capture_views[capture_index + 1].Enable = true;
}
// отмечает зону не захваченой красными при визулиязаторе зон захвата 
function UN_CAPTURE_AREA(capture_index) {
if (capture_index < 0 || capture_index >= capture_areas.length) return;
capture_views[capture_index].Color = BLUE_COLOR;
 if (capture_index < capture_properties.length - 1 && capture_properties[capture_index + 1].Value < capture_points) {
		capture_views[capture_index + 1].Enable = false;
           }
	if (capture_index > 0 && capture_properties[capture_index - 1].Value < capture_points) {
		capture_views[capture_index].Enable = false;

	}
} 
// задаем или снимаем спавнпоинты захваченой области красными
function SET_SPAWN_INDEX() {
 // поиск макс захваченой области 
const MAX_INDEX = -1;
  for (const i = 0; i < capture_properties.length; ++i) {
   if (capture_properties[i].Value >= capture_points) {
			MAX_INDEX = i;
             }
   }
	capturedAreaIndexProp.Value = MAX_INDEX;
}
// при смене индекса захвата
capturedAreaIndexProp.OnValue.Add(function (capture_prop) {
 const capture_index = capture_prop.Value;
const captured_spawns = Spawns.GetContext(redTeam);
// очистка спавнов
 captured_spawns.CustomSpawnPoints.Clear();
// если нет захвата то сброс спавнов
   if (capture_index < 0 || capture_index >= capture_areas.length) return;
// задаем спавны
 const CAPTURE_AREA = capture_areas[capture_index];
CAPTURE_AREA.Ranges.All.forEach(capture_iter => {
 const RANGE = capture_iter;
// определяем куда смотреть спавнам
 let LOOK_POINT = {};
if (capture_index < capture_areas.length - 1) LOOK_POINT = capture_areas[capture_index + 1].Ranges.GetAveragePosition();
   else {
if (def_areas.length > 0) LOOK_POINT = def_areas[0].Ranges.GetAveragePosition();
 }log.debug("range=" + range);
const spawns_count = 0;
 for (const X = range.Start.x; X < range.End.X; X += 2)
     for (const Z = range.Start.Z; Z < range.End.Z; Z += 2) {
 captured_spawns.CustomSpawnPoints.Add(X, range.Start.Y, Z, Spawns.GetSpawnRotation(X, Z, LOOK_POINT.X, LOOK_POINT.Z));
   ++spawns_count;
if (spawns_count > MAX_SPAWNS_BY_AREA) return;
	  }
});

// проверка валидности режима
if (def_areas.length == 0) Validate.ReportInvalid("GameMode/Validation/NeedDefTaggedArea");
 else Validate.ReportValid();

// применяем параметры создания комнаты
Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
Map.Rotation = GameMode.Parameters.GetBool("MapRotation");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

// создаем визуализацию зон защиты
const DEF_VIEW = AreaViewService.GetContext().Get("DEF_VIEW");
DEF_VIEW.Color = RED_COLOR;
DEF_VIEW.Tags = [DefAreaTag];
DEF_VIEW.Enable = true;

// создаем триггер зон защиты
const DEF_TRIGGER = AreaPlayerTriggerService.Get("DEF_TRIGGER");
DEF_VIEW.Tags = [DefAreaTag];
DEF_VIEW.OnEnter.Add(function (p) {
 if (p.Team == blueTeam) {
p.Ui.Hint.Value = DefThisAreaHint;
		return;
}
if (p.Team == redTeam) {
 if (stateProp.Value == GameStateValue) {
p.Ui.Hint.Value = HoldPositionHint;
 else
p.Ui.Hint.Reset();
      return;
}
	}
});
DEF_TRIGGER.OnExit.Add(function (p) {
	p.Ui.Hint.Reset();
});
DEF_TRIGGER.Enable = true;

// задаем обработчик таймера триггера
defTickTimer.OnTimer.Add(function (t) {
 DefTriggerUpdate();
 CaptureTriggersUpdate();
});
function DefTriggerUpdate() {
	// ограничитель игрового режима
	if (stateProp.Value != GameStateValue) return;
	// поиск количества синих и красных в триггере
	var blueCount = 0;
	var redCount = 0;
	var players = defTrigger.GetPlayers();
	for (var i = 0; i < players.length; ++i) {
		var p = players[i];
		if (p.Team == blueTeam) ++blueCount;
		if (p.Team == redTeam) ++redCount;
	}

	// если красных нет в зоне то восстанавливаются очки
	if (redCount == 0) {
		// восстанавливаем очки до несгораемой суммы
		if (blueTeam.Properties.Get("Deaths").Value % SavePointsCount != 0)
			blueTeam.Properties.Get("Deaths").Value += RepairPointsBySecond;
		// синим идет подска об обороне зоны
		if (stateProp.Value == GameStateValue)
			blueTeam.Ui.Hint.Value = DefBlueAreaHint;
		return;
	}

	// если есть хоть один красный то очки отнимаются
	blueTeam.Properties.Get("Deaths").Value -= redCount;
	// синим идет подсказка что зону захватывают
	if (stateProp.Value == GameStateValue)
		blueTeam.Ui.Hint.Value = YourAreaIsCapturing;
}
// обновление зон захвата
function CaptureTriggersUpdate() {
	// ограничитель игрового режима
	if (stateProp.Value != GameStateValue) return;
	// ограничитель
	if (captureTriggers == null) return;
	if (captureTriggers.length == 0) return;
	// обновление
	for (var i = 0; i < captureTriggers.length; ++i) {
		// берем триггер
		var trigger = captureTriggers[i];
		// поиск количества синих и красных в триггере
		var blueCount = 0;
		var redCount = 0;
		players = trigger.GetPlayers();
		for (var j = 0; j < players.length; ++j) {
			var p = players[j];
			if (p.Team == blueTeam) ++blueCount;
			if (p.Team == redTeam) ++redCount;
		}
		// берем свойство захвата
		var index = -1;
		for (var i = 0; i < captureTriggers.length; ++i)
			if (captureTriggers[i] == trigger) {
				index = i;
				break;
			}
		if (index < 0) continue;
		var value = captureProperties[index].Value;
		// определяем на сколько очков изменять зону
		// очки за присутствие синих
		var changePoints = - blueCount * BlueCaptureW;
		// очки за присутствие красных
		if (index == 0 || captureProperties[index - 1].Value >= CapturePoints)
			changePoints += redCount * RedCaptureW;
		// спад очков захвата, если нет красных
		if (redCount == 0 && value < CapturePoints) changePoints -= CaptureRestoreW;
		// ограничители
		if (changePoints == 0) continue;
		var newValue = value + changePoints;
		if (newValue > MaxCapturePoints) newValue = MaxCapturePoints;
		if (newValue < 0) newValue = 0;
		// изменяем очки захвата зоны
		captureProperties[index].Value = newValue;
	}
}

// блок игрока всегда усилен
BreackGraph.PlayerBlockBoost = true;

// параметры игры
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// создаем команд
var blueTeam = teams.create_team_blue();
var redTeam = teams.create_team_red();
blueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// делаем моментальный спавн синим
blueTeam.Spawns.RespawnTime.Value = 10;
redTeam.Spawns.RespawnTime.Value = 0;

// задаем макс очкой синей команды
//var maxDeaths = Players.MaxCount * 5;
blueTeam.Properties.Get("Deaths").Value = DefPoints;
//redTeam.Properties.Get("Deaths").Value = maxDeaths;
// задаем что выводить в лидербордах
LeaderBoard.PlayerLeaderBoardValues = [
	{
		Value: "Kills",
		DisplayName: "Statistics/Kills",
		ShortDisplayName: "Statistics/KillsShort"
	},
	{
		Value: "Deaths",
		DisplayName: "Statistics/Deaths",
		ShortDisplayName: "Statistics/DeathsShort"
	},
	{
		Value: "Spawns",
		DisplayName: "Statistics/Spawns",
		ShortDisplayName: "Statistics/SpawnsShort"
	},
	{
		Value: "Scores",
		DisplayName: "Statistics/Scores",
		ShortDisplayName: "Statistics/ScoresShort"
	}
];
LeaderBoard.TeamLeaderBoardValue = {
	Value: "Deaths",
	DisplayName: "Statistics\Deaths",
	ShortDisplayName: "Statistics\Deaths"
};
// вес игрока в лидерборде
LeaderBoard.PlayersWeightGetter.Set(function (player) {
	return player.Properties.Get("Kills").Value;
});

// задаем что выводить вверху
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: "Deaths" };

// разрешаем вход в команды по запросу
Teams.OnRequestJoinTeam.Add(function (player, team) { team.Add(player); });
// спавн по входу в команду
Teams.OnPlayerChangeTeam.Add(function (player) { player.Spawns.Spawn() });

// делаем игроков неуязвимыми после спавна
var immortalityTimerName = "immortality";
Spawns.GetContext().OnSpawn.Add(function (player) {
	player.Properties.Immortality.Value = true;
	player.Timers.Get(immortalityTimerName).Restart(5);
});
Timers.OnPlayerTimer.Add(function (timer) {
	if (timer.Id != immortalityTimerName) return;
	timer.Player.Properties.Immortality.Value = false;
});

// если в команде количество смертей занулилось то завершаем игру
Properties.OnTeamProperty.Add(function (context, value) {
	if (context.Team != blueTeam) return;
	if (value.Name !== "Deaths") return;
	if (value.Value <= 0) RedWin();
});

// счетчик спавнов
Spawns.OnSpawn.Add(function (player) {
	++player.Properties.Spawns.Value;
});
// счетчик смертей
Damage.OnDeath.Add(function (player) {
	++player.Properties.Deaths.Value;
});
// счетчик убийств
Damage.OnKill.Add(function (player, killed) {
	if (killed.Team != null && killed.Team != player.Team) {
		++player.Properties.Kills.Value;
		player.Properties.Scores.Value += 100;
	}
});

// настройка переключения режимов
mainTimer.OnTimer.Add(function () {
	switch (stateProp.Value) {
		case WaitingStateValue:
			SetBuildMode();
			break;
		case BuildModeStateValue:
			SetGameMode();
			break;
		case GameStateValue:
			BlueWin();
			break;
		case EndOfMatchStateValue:
			RestartGame();
			break;
	}
});

// задаем первое игровое состояние
SetWaitingMode();

// состояния игры
function SetWaitingMode() {
	stateProp.Value = WaitingStateValue;
	Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
	Spawns.GetContext().enable = false;
	mainTimer.Restart(WaitingPlayersTime);
}

function SetBuildMode() {
	// инициализация режима
	for (var i = 0; i < captureAreas.length; ++i) {
		// визуализатор
		var view = captureViews[i];
		view.Area = captureAreas[i];
		view.Color = UnCapturedColor;
		view.Enable = i == 0;
		// триггер
		var trigger = captureTriggers[i];
		trigger.Area = captureAreas[i];
		trigger.Enable = true;
		//trigger.OnEnter.Add(LogTrigger);
		// свойство для захвата
		var prop = captureProperties[i];
		prop.Value = 0;
	}

	stateProp.Value = BuildModeStateValue;
	Ui.GetContext().Hint.Value = ChangeTeamHint;
	blueTeam.Ui.Hint.Value = PrepareToDefBlueArea;
	redTeam.Ui.Hint.Value = WaitingForBlueBuildHint;

	blueTeam.Inventory.Main.Value = false;
	blueTeam.Inventory.Secondary.Value = false;
	blueTeam.Inventory.Melee.Value = true;
	blueTeam.Inventory.Explosive.Value = false;
	blueTeam.Inventory.Build.Value = true;
	blueTeam.Inventory.BuildInfinity.Value = true;

	redTeam.Inventory.Main.Value = false;
	redTeam.Inventory.Secondary.Value = false;
	redTeam.Inventory.Melee.Value = false;
	redTeam.Inventory.Explosive.Value = false;
	redTeam.Inventory.Build.Value = false;

	mainTimer.Restart(BuildBaseTime);
	Spawns.GetContext().enable = true;
	SpawnTeams();
}
function SetGameMode() {
	stateProp.Value = GameStateValue;
	//Ui.GetContext().Hint.Value = "Hint/AttackEnemies";
	blueTeam.Ui.Hint.Value = DefBlueAreaHint;
	redTeam.Ui.Hint.Value = RunToBliePointHint;

	blueTeam.Inventory.Main.Value = true;
	blueTeam.Inventory.MainInfinity.Value = true;
	blueTeam.Inventory.Secondary.Value = true;
	blueTeam.Inventory.SecondaryInfinity.Value = true;
	blueTeam.Inventory.Melee.Value = true;
	blueTeam.Inventory.Explosive.Value = true;
	blueTeam.Inventory.Build.Value = true;

	redTeam.Inventory.Main.Value = true;
	redTeam.Inventory.Secondary.Value = true;
	redTeam.Inventory.Melee.Value = true;
	redTeam.Inventory.Explosive.Value = true;
	redTeam.Inventory.Build.Value = true;

	mainTimer.Restart(GameModeTime);
	defTickTimer.RestartLoop(DefTimerTickInderval);
	Spawns.GetContext().Despawn();
	SpawnTeams();
}
function BlueWin() {
	stateProp.Value = EndOfMatchStateValue;
	Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

	var spawns = Spawns.GetContext();
	spawns.enable = false;
	spawns.Despawn();
	Game.GameOver(blueTeam);
	mainTimer.Restart(EndOfMatchTime);
}
function RedWin() {
	stateProp.Value = EndOfMatchStateValue;
	Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

	var spawns = Spawns.GetContext();
	spawns.enable = false;
	spawns.Despawn();
	Game.GameOver(redTeam);
	mainTimer.Restart(EndOfMatchTime);
}
function RestartGame() {
	Game.RestartGame();
}

function SpawnTeams() {
	for (const team of Teams)
		Spawns.GetContext(team).Spawn();
}
