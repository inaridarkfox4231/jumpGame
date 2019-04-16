'use script';

// タイトルからエンターでプレイスタート（もしかしたらコンフィグあるかもだけど）
// プレイ中はスペースキーでジャンプするだけ
// 狐が走り続ける　障害物はサボテン　高さは3パターン
// 鳥は地面すれすれか普通にかわすかの2パターン、色で区別、赤は直前にパターンを変える。
// そのバリエーション。組み合わせ、いくらでも。
// ゲームオーバーになるまでのスコアを競う。スコアは高いものに更新される。
// ゲームオーバーになったらコンティニューするかタイトル。以上。
// サボテンが
// にょきって伸びるやつやろうと思ったらcolliderのupdate, hもwも・・って話。うん。
// 背景の地面の部分だけオブジェクトの描画後にrectでやるようにすればいい。あとはyをflowでいじるだけ。

let all;
let hueSet = [];
let keyFlag;

let imgSet = [];

const IDLE = 0;
const PRE = 1;
const ACT = 2;

const PLAYER_POS = 100; // プレイヤーの固定x座標
const GROUND = 400; // 地面の高さ

function preload(){
  imgSet.push(loadImage('./assets/right_0.png'));
  imgSet.push(loadImage('./assets/right_1.png'));
  imgSet.push(loadImage('./assets/cactus_0.png'));
}

function setup(){
  createCanvas(640, 480);
  colorMode(HSB, 100);
  hueSet = [0, 10, 17, 35, 52, 64, 80];
  let initialFlow = initialize();
  all = new entity();
  all.setFlow(initialFlow);
  keyFlag = 0;
  all.activate();
}

function draw(){
  all.update();
  all.render();
}

// ------------------------------------------------------------------------------------- //
// initialize.

function initialize(){
  const _titleFlow = new titleFlow();
  const _playFlow = new playFlow(); // ステージをいくつか用意したりするかもしれないけど(引数がステージ番号)
  const _gameoverFlow = new gameoverFlow();
  _titleFlow.addFlow(_playFlow);
  _playFlow.addFlow(_gameoverFlow);
  _gameoverFlow.addFlow(_playFlow); // デフォルトはそのままプレイ再開。ハイスコアだけ更新。
  _gameoverFlow.addFlow(_titleFlow); // 現時点では不要だけど、config作る可能性も考慮しておく。
  // title→play→gameover→titleって感じで。titleに・・いきなりplayでいい気がしてきたけどどうしよ。
  // gameoverからplayにいくかtitleにいくか選択、titleでconfig出来るようにするとかありかも。
  // 場合によってはtitle⇔configってなるかもだけどそれはまだ先の話ね。
  return _titleFlow;
}

// ----------------------------------------------------------------------------------------------- //
// key and counter.

function keyTyped(e){
  if(key === 'q'){ noLoop(); } // デバッグ用。
  else if(key === 'p'){ loop(); } // デバッグ用。
  else if(key === 'z'){ keyFlag |= 2; } // Zはカーソル選択用
  if(e.charCode === 32){ keyFlag |= 4; } // スペースキー
  if(e.charCode === 13){ keyFlag |= 8; } // エンターキー
}
function flagReset(){
  keyFlag = 0;
}

// 簡単なカウンター. resetの名称をsettingにしました。こっちの方がしっくりくるので。
class counter{
  constructor(){
    this.cnt = 0;
    this.limit = -1; // limit復活(-1かあるいは正の数を取る)
  }
  getCnt(){ return this.cnt; }
  getProgress(){ // 進捗
    if(this.limit < 0){ return this.cnt; }
    if(this.cnt >= this.limit){ return 1; }
    return this.cnt / this.limit;
  }
  setting(limit = 0){ // reset → setting.(改名)
    this.cnt = 0;
    this.limit = limit;
  }
  step(diff = 1){ // diffは正の値が前提
    this.cnt += diff;
  }
}

// ----------------------------------------------------------------------------------------------- //
// collider. 位置情報だけでいい。

class collider{
  constructor(x, y, w, h){
    // kind廃止。
    this.x = x; // 左上
    this.y = y; // 左上
    this.w = w; // 横幅
    this.h = h; // 縦幅
  }
  // 各種getter。
  // なくてもいいが、あったほうが楽。
  get top(){ return this.y; }
  get bottom(){ return this.y + this.h; }
  get left(){ return this.x; }
  get right(){ return this.x + this.w; }
  setX(newX){ this.x = newX; }
  setY(newY){ this.y = newY; }
  // setW(newW){ this.w = newW; }
  // setH(newH){ this.h = newH; }
}

// 今気付いたけど組み合わせってplayerとenemyだけだから下の関数で総当たりで
// player & enemyやるだけじゃんって気づいてしまった（そしてhitしたらbreakすれば万事解決）→validation要らない

function detectCollision(rect1, rect2){
  // 引数はcollider.
  const horizontal = (rect2.left < rect1.right) && (rect1.left < rect2.right);
  const vertical = (rect2.top < rect1.bottom) && (rect1.top < rect2.bottom);
  return (horizontal && vertical);
}

// ----------------------------------------------------------------------------------------------- //
// flow.

class flow{
  constructor(){
    this.convertList = [];
    this.initialState = PRE; // 基本PRE, 内容が単純ならばACTでOK.
  }
  addFlow(_flow){ this.convertList.push(_flow); }
  execute(_actor){ this.convert(_actor); } // デフォルトはconvertだけ（initializeはオプション）
  convert(_actor){
    // デフォルトは0番、undefinedがセットされた場合の処理はactorに書く。
    if(this.convertList.length === 0){ _actor.setFlow(undefined); }
    else{
      // ひとつしかないなら0番だし複数ある時はどうせ上書き、ランダムがいいならハブをかませりゃいいんだ
      _actor.setFlow(this.convertList[0]);
    }
  }
  update(){} // 更新用
  // render(gr){} // 描画用
}

// ----------------------------------------------------------------------------------------------- //
// enemyの挙動
class run extends flow{
  constructor(speed){
    super();
    this.speed = speed;
    this.initialState = ACT;
  }
  execute(_enemy){
    _enemy.x -= this.speed;
  }
}

// ----------------------------------------------------------------------------------------------- //
// actor. デフォルトでのカウンターをなくした。

class actor{
  constructor(){
    this._type = ""; // タイプ・・衝突判定のバリデーションに使う. 必要に応じて設定する
    this.currentFlow = undefined;
    this.isActive = false;
    this.state = IDLE;
  }
  activate(){ this.isActive = true; }
  inActivate(){ this.isActive = false; }
  setState(newState){ this.state = newState; }
  setFlow(newFlow){
    if(newFlow === undefined){
      this.setState(IDLE); this.inActivate();
    }else{
      this.setState(newFlow.initialState); // flowが始まるときのstate(PREまたはACT)
    }
    this.currentFlow = newFlow;
  }
  update(){
    if(!this.isActive){ return; } // ここはそのまま
    this.currentFlow.execute(this); // これだけ。すっきりした。
  }
  render(){} // 描画用
}

class entity extends actor{
  constructor(){
    super();
  }
  render(){
    this.currentFlow.render(); // flowの内容による
  }
}

// サボテン、背景の雲、鳥とかその辺。障害物。衝突判定は、少ないので物理でOK.
// ただパターンを増やしたい。レベルが高くなるほど難しいパターンが出やすくなる感じで。
// 火を吐いて障害物破壊するとかやったら面白そう（？）しません

// playerはactorでなくていいや

// バリエーションをどう作るかって話。サボテンも鳥も動くパターンは決まっているので、生成するだけでいい。
// んー・・数ひとつ与えるだけで敵作りたいね。あとは間隔だけ。
// たとえば0, 1, 2, 3, 4にサボテン0, 1, 2と鳥0, 1を対応させるとして、(0, 120), (0, 120), (0, -1)で、
// 0のサボテン出現→120フレームあとに0のサボテン出現→120フレーム後に0のサボテン出現からの終了、的な。
// 120のところをランダムにすればより汎用的なパターンにすることができる。そんな感じ。
// パターンごとのインターバルは最初180から始めてレベルが上がるごとに下げ・・最後60まで減らす。
// そこら辺のデザインはおいおい。
// パターンの始まり：オブジェクト出現（右端）。パターンの終了：ラストオブジェクト消滅（左端）

// つまるところ、敵の配列とインターバルの配列以外は何もいらないから、flowは1種類で足りるのね。

// めんどくさい。initializeをresetのたびに呼び出して全部作っちゃえ。
// ・・・めんどくさい、enemyGeneratorがactorである必要ないんじゃない？？
// 120から始まって、30回クリアするごとに10ずつ感覚が狭まって行って、最終的に60間隔になるようにしよう。
// その30のセットだけをいろいろ確率とかでいじるようにする。つまりactorである必要はどこにもなくて、単に・・
// 単に順繰りに敵を出してあとはintervalで待ってとかそういう感じ。
// モードチェンジはメソッドで行う感じで。
class enemyGenerator{
  constructor(){
    this.level = 1;
    this.pattern = [];
    this.interval = 120;
    this.count = 0; // intervalだけ進んだらindex増やして次の敵を出現させる、index増やしたときアレならlevel up.
    this._enemy = createEnemy(0);
    this.index = 0; // indexがenemySet.lengthになったらパターンチェンジ発動。
  }
  initialize(){
    this.level = 1;
    this.pattern = this.createPattern();
    this.interval = 120;
    this.count = 0;
    this.index = 0;
  }
  update(){
    // どうすっかなー
    this._enemy.update();
    if(this.count > 0){
      this.count--;
    }else if(!this._enemy.isActive){
      this.setEnemy(this.pattern[this.index]);
      this.index++;
    }
    if(this.index === this.pattern.length){
      this.levelUp();
    }
    if(this.ejectEnemy()){
      this.count = this.interval;
    }
  }
  getLevel(){
    return this.level;
  }
  setEnemy(kind){
    // 敵を出す
    this._enemy = createEnemy(kind);
    this._enemy.activate();
  }
  ejectEnemy(){
    // 敵を消す
    if(!this._enemy.isActive){ return false; }
    if(this._enemy.x < -40){
      this._enemy.inActivate();
      return true; // trueが返ったらintervalに入ったのち次の敵を出す。
    }
    return false; // 除去に失敗
  }
  levelUp(){
    this.level = min(7, this.level + 1);
    this.pattern = this.createPattern();
    this.interval = max(this.interval - 10, 60)
    this.index = 0;
  }
  createPattern(){
    // 配列を返す。サボテンや鳥の集合体。30個からなる。level:1~7で7がMAXでその場合は同じパターンの使いまわし。
    // というかlevelが7までしかないので必然的に同じ関数が呼び出される感じ。
    if(this.level === 1){
      return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
  }
  render(){
    this._enemy.render();
  }
}

// やめる。グラフィックと動き方だけでしょ、flowで指定するよそのくらい。で、colliderも。そうすれば一元化できる。
// 1つの数ですべて指定しましょう、面倒。
// this.x < -40になったら消滅する、というか配列から除去する。
// generatorのenemySetにpushしていって頭のやつ見てxがアレならshift(0)で排除する（いわゆるキュー構造）
class enemy extends actor{
  constructor(kind, x, y, w, h, f){
    super();
    this.kind = kind;
    this.graphic = imgSet[this.kind]; // kindにより画像を変える
    this.x = x;
    this.y = y;
    this.h = h;
    this._collider = new collider(x, y - h, w, h);
    this.currentFlow = f; // セットするべきflowも事前に決めてある
  }
  update(){
    this.currentFlow.execute(this); // ここでxやらyが更新される
    this._collider.setX(this.x);
    this._collider.setY(this.y - this.h);
  }
  render(){
    image(this.graphic, this.x, this.y - this.h); // これでいいのね？
  }
}

// createEnemyでkindにより場合分けしてflow作ってセットしてwとかhも決める、xとyの初期値も決める。イメージも。
function createEnemy(kind){
  if(kind === 0){
    // サボテン0: ただ直進してくるだけ。
    let f = new run(4);
    return new enemy(kind + 2, width, GROUND, 30, 40, f);
  }
}

// ----------------------------------------------------------------------------------------------- //
// player.
// actorではありません。いい加減この考え方から脱却すべきかな・・

// 描画は例のキツネ、アニメーション2パターンくるくるで。
// ごめんなさいジャンプするのでcollider変化します（当たり前）
class player{
  constructor(){
    // アニメーションの登録
    // HPはありませんよ
    this.x; // プレイヤーの像の左端の座標
    this.y; // プレイヤーの足の高さ（描画時は28減らして上にする）
    this.graphic = [];
    this.graphic.push(imgSet[0]);
    this.graphic.push(imgSet[1]);
    this.patternIndex = 0;
    // flowは無しでいいや。
    this._collider = new collider(PLAYER_POS, GROUND - 28, 28, 28);
    this.count = 0;
  }
  initialize(){
    this.x = PLAYER_POS;
    this.y = GROUND;
  }
  // スペースキーでジャンプ。30フレームで180の高さまでジャンプしたいわね。計算して！サボテンを40, 80, 120にする。
  // 具体的な動きをflowに書くだけ、特にupdateを上書きする必要はないな。
  update(){
    if(this.count > 0){
      // y座標を更新
      this.y = GROUND - 9 * this.count * (40 - this.count) / 20; // 180.
      this.count--;
    }else{
      this.y = GROUND;
    }
    if((keyFlag & 4) && this.count === 0){
      this.count = 40; flagReset();
    }
    // colliderをupdate.
    this._collider.setY(this.y);
  }
  render(){
    // 画像の描画。切り替えはframeCountを割り算して行う、考えることは特にないかな。
    if(frameCount % 10 === 0){ this.patternIndex = (this.patternIndex + 1) % 2; }
    image(this.graphic[this.patternIndex], this.x, this.y - 28);
  }
}

// ----------------------------------------------------------------------------------------------- //
// state関連
class titleFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
  }
  execute(_entity){
    // エンターキーでconvertしてplay start.
    if(keyFlag & 8){
      this.convert(_entity); flagReset();
    }
  }
  convert(_entity){
    _entity.setFlow(this.convertList[0]); // ひとつだけしか行先がない
  }
  render(){
    background(70);
    push();
    textSize(40);
    fill(0);
    text('RUNNING FOX', 100, 100);
    text('PRESS ENTER', 100, 200);
    pop();
  }
}
// selectすっとばしていきなりplayでいいです

class playFlow extends flow{
  constructor(){
    super();
    this._player = new player(PLAYER_POS, GROUND); // playerおきつね
    this._enemyGenerator = new enemyGenerator(); // 敵を作るactor.
    this.initialState = PRE;
    // stageNumberは存在しません
    // playonとか要らないです。毎回リセット。
    this.backgroundColor = color(0, 30, 100); // レベルが上がるごとに色が変わるとか面白そうね
    // 次のstateはgameoverだけです！！
    // 衝突については総当たりで、カテゴリーごとのバリデーションだけやる。後回し。
    // とはいえ当たった瞬間にゲーム終了、スコア更新なので、それほどやることは多くない。
    // スコアを用意してrenderで表示したり更新したりする
    // playerとenemyGeneratorは毎回初期化、initialStateはいちいちPREに戻すのは自動でやってくれる。
  }
  initialize(_entity){
    // playerとenemyGeneratorのイニシャライズ
    this._player.initialize();
    this._enemyGenerator.initialize();
    // ジェネレータのinitializeではinitialFlow的な何かをセットして最初からやり直し。
  }
  execute(_entity){
    if(_entity.state === PRE){
      this.initialize(_entity);
      _entity.setState(ACT);
    }
    // とりあえずupdateくらいで
    this._player.update();

    this._enemyGenerator.update(); // 多分enemyGeneratorは普通にある・・
    // あー、クリアはないんだっけ。ゲームオーバーだけだ。だからクリアstate要らない。
    // enemyGeneratorはある。

    // ここで衝突判定

    // 先にthis.colldersetを[]にしたうえでrectを登録
    // this.collisionCheck(); // this.colliderSetの情報を元にチェック

    // 衝突判定はrectの集合をジェネレータのenemySetとかplayerとかから放り込んで、
    // あとは衝突が起こるかどうか、衝突即ゲーム終了なのでだいぶ単純化されるはず。
    // 極端な話、特定のフェイズにおける数の大小だけでいける・・

    // ポーズやめよ。緊張感がなくなる。
    // だからplayからはゲームオーバーにしか行かない感じ。
  }
  render(){
    background(this.backgroundColor);
    // スコアの描画
    this._player.render();
    this._enemyGenerator.render();
  }
  // setStage(){
  // // ここで色々準備するよりはもう単純な話だし
  // // パターン放り込んだ後は確率の話になる・・レベルがあがったらパターンの差し替えと確率変動だけ
  // // それはここでやるより・・んー。updateでやること、その内容もあっちに書くとなるともうここでやることがないです。
  // }
  // ステージに入るたびに初動段階でもろもろリセットするのでページ遷移でやることが無い。
}

// playFlowにおいて障害物に激突したらgameoverに移行
class gameoverFlow extends flow{
  constructor(){
    super();
    this.initialState = ACT;
  }
  execute(_entity){
    // Z押すたびにカーソルが動く、エンターキーで決定（スペースキーは使わないほうがよさそう）
    if(keyFlag & 128){
      this.convert(_entity); flagReset();
    }
  }
  render(){
    // 中央に黒い四角とメッセージを表示
    // カーソルでcontinueかto titleかを選択してエンターで決定
    push();
    fill(0);
    rect(160, 120, 320, 240);
    fill(100);
    textSize(30);
    text('GAME OVER...', 180, 180)
    textSize(20);
    text('CONTINUE', 180, 210);
    text('TO TITLE', 180, 240);
    pop();
  }
}
