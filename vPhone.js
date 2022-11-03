//LiteLoaderScript Dev Helper
/// <reference path="c:\Users\zhang\Dropbox\Aids/dts/HelperLib-master/src/index.d.ts"/> 

ll.registerPlugin(
    /* name */ "vPhone",
    /* introduction */ "Use vPhone in MCBE! by HelmetGreen",
    /* version */[0, 0, 1],
    /* otherInformation */ {}
);

/*功能
模拟苹果手机：
    内置应用（写在插件里）：
        设置：
            信息锁屏：
                开关
                锁屏信息
                    [是否有市民，tps，延迟，使用的平台，时间，定位]
            通知设置：
                每个应用的通知开关
                未知来源通知开关
            应用管理：
                卸载应用
        应用商店：
            添加应用（applib -> userappdb）
        通知中心：
            清空通知
            通知列表
        ？通讯录（短信）：
            ？添加通讯录
    可卸载应用：
        原点广告 --> /ad
        贴吧 --> /post
        OC --> /oc
        称号系统 --> /tl
        实体查询 --> /entque
        传送 --> /stp
        翻译 --> /toenglish/chinese/korean/japanese
        市民注册 --> /
*/
/*结构
    数据库：
        每个用户数据库：
            用户设置{}

            应用数据{}
                AppID：
                    {name:String
                    cmd:String
                    isOn:bool
                    notify:bool}
            通知列表{}
                content:string
                source:string
                已读（打开手机检测将未读通知顶部弹出）
        应用库：
            AppID:
                name:
                cmd:
    手机：
        用户（Player）
        
        ////////////////
        显示锁屏
        显示菜单
        设置表单
        应用商店
*/

var DATAPATH = "./plugins/vPhone/db/";
var USERDATAPATH = "./plugins/vPhone/userdb/";

class vPhone {
    owner;

    //appDB;
    //settingDB;
    //notificationDB

    vPhone(pl) {
        this.owner = pl;
    }

    Open() {
        //lock?

        this.ShowHomeScreen();
    }

    //***************************** */
    ShowLockScreen() {
        let ls = mc.newCustomForm();
        ls.setTitle("vPhone");
        let showlist = new Array();
        //[时间，*是否有市民，定位，使用的平台，*tps，延迟，]
        showlist.push(system.getTimeStr());
        showlist.push("Pos: [" + this.owner.blockPos.x + ", " + this.owner.blockPos.y + ", " + this.owner.blockPos.z + "] - " + this.owner.blockPos.dim);
        showlist.push("Platform: " + this.owner.getDevice().os);
        showlist.push("Latency: " + this.owner.getDevice().avgPing + "ms")
        for (let content of showlist) {
            ls.addLabel(content);
        }
        this.owner.sendForm(ls, (player, datas) => {
            return;
        });
    }

    ShowHomeScreen() {
        let homeform = mc.newSimpleForm();
        homeform.setTitle("vPhone");

        //可以加东西，记得改数

        //可选应用
        let appDB = new KVDatabase(USERDATAPATH + this.owner.xuid + "/appDB");
        let applist = appDB.listKey();
        let displayList = new Array();
        for (let appid of applist) {
            let obj = appDB.get(appid);
            if (obj.isOn) {
                homeform.addButton(obj.name);
                displayList.push(appid);
            }
        }
        appDB.close();

        //系统应用
        homeform.addButton(Format.Bold + "AppStore");
        homeform.addButton(Format.Bold + "Settings")

        this.owner.sendForm(homeform, (player, id) => {
            if (id == null) {
                return;
            }
            let appnum = displayList.length;
            if (id == appnum) {
                this.AppStoreForm();
                this.ShowHomeScreen();//测试
            }
            else if (id == appnum + 1) {
                this.SettingsForm();
                this.ShowHomeScreen();//测试
            }
            else {
                let appDB = new KVDatabase(USERDATAPATH + player.xuid + "/appDB");
                let obj = appDB.get(displayList[id]);
                appDB.close();
                player.runcmd(obj.cmd);
            }
            //this.ShowHomeScreen();
        });
    }

    AppStoreForm() {
        let appstorefm = mc.newCustomForm();
        appstorefm.setTitle("AppStore");
        let appDB = new KVDatabase(DATAPATH + "/appDB");
        let applist = appDB.listKey();
        for (let app of applist) {
            appstorefm.addSwitch(app.name, false);
        }
        appDB.close();
        this.owner.sendForm(appstorefm, (player, datas) => {
            //这里打开开关的添加，不打开的并不删除
            let appDB = new KVDatabase(DATAPATH + "/appDB");
            let usrappDB = new KVDatabase(USERDATAPATH + player.xuid + "/appDB");
            let applist = appDB.listKey();
            for (let i = 0; i < applist.length; i++) {
                if (datas[i]) {
                    usrappDB.set(applist[i], appDB.get(applist[i]));//复制
                }
            }
            usrappDB.close();
            appDB.close();
        })
    }

    SettingsForm() {
        let settingsfm = mc.newSimpleForm();
        settingsfm.setTitle("Settings");
    }


}

mc.listen("onServerStarted", () => {
    let applibcmd = mc.newCommand("applib", "Manage App Library in vPhone", PermType.GameMasters);
    applibcmd.mandatory("name", ParamType.RawText);
    applibcmd.mandatory("cmd", ParamType.String)
    applibcmd.overload("name", "cmd");
    applibcmd.setCallback((_cmd, _ori, out, res) => {
        ManageAppLib(res.name, res.cmd);
    })
    applibcmd.setup();

    let phonecmd = mc.newCommand("phone", "Open your phone", PermType.Any);
    phonecmd.setAlias("vp");
    phonecmd.overload();
    phonecmd.setCallback((_cmd, _ori, out, res) => {
        if (_ori.player != null) {
            let vp = new vPhone(_ori.player);
            vp.Open();
        }
    })
    phonecmd.setup();
})

/*
{name:String
cmd:String}
    原点广告 --> /ad
    贴吧 --> /post
    OC --> /oc
    称号系统 --> /tl
    实体查询 --> /entque
    传送 --> /stp
    翻译 --> /toenglish/chinese/korean/japanese
    市民注册 --> /
*/
function newAppLib(name, cmd) {
    let appDB = new KVDatabase(DATAPATH + "/appDB");
    let applist = appDB.listKey();
    let appid = applist.length.toString();
    let app = new Object();
    app.name = name;
    app.cmd = cmd;
    appDB.set(appid, app);
    appDB.close();
}