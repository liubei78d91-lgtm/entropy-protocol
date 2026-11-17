/* =========================================================
   逆熵协议 · 内容 content.js
   —— 只放“文本 + 数值 + 剧情 + 结局”，不含规则逻辑
   —— 想更新游戏：改这个文件，然后把 version 加一
   ========================================================= */
window.CONTENT = {
  version: "1.1.2",
  title: "逆熵协议",
  subtitle: "三十日交易所",
  tagline: "用记忆、健康与信用，向世界预支三十天。",
  release: "2026-11-17",

  /* ---------------- 数值配置（改这里就能调平衡） ---------------- */
  config: {
    days: 30,
    apBase: 3,
    startCash: 3000,
    startHealth: 100, maxHealth: 100,
    startMemory: 100, maxMemory: 100,
    startCredit: 50,

    workPay: 800,
    workHealth: 6,
    restHealth: 18,

    taxBase: 100,
    taxGrowth: 15,
    taxCashRate: 0.04,

    debtRate: 0.05,
    loanDebt: 1050,

    lowRate: 0.03,
    compoundRate: 0.02,
    highCap: 5000,

    timeFoldHealth: 4,
    anchorIncomePenalty: 0.10,

    entropyMax: 10,
    forgetMemoryBelow: 30,
    forgetChance: 0.2,
    freeFragments: 2,
    badgeCount: 7,

    valuation: { influence: 100, ep: 300, memory: 80, intel: 50 }
  },

  /* ---------------- 规则碎片 ---------------- */
  fragments: {
    compound:      { name: "复利之眼",   short: "投资+2%",     desc: "投资收益 +2%，但每日熵税 +10 现金。" },
    healthPledge:  { name: "健康抵押",   short: "税负转健康",  desc: "付不起熵税时，只扣健康，不扣记忆。" },
    memoryCash:    { name: "记忆套现",   short: "10记忆→1000", desc: "每天一次：10 记忆换 1000 现金。记忆低于 30 时遗忘概率翻倍。" },
    creditLever:   { name: "信用杠杆",   short: "债务减半",    desc: "信用高于 70 时，借贷产生的债务减半。" },
    entropyAnchor: { name: "熵减锚",     short: "每日-1熵",    desc: "每天自动 -1 熵；但所有现金收入 -10%。" },
    timeFold:      { name: "时间折叠",   short: "+1AP",        desc: "每天行动点 +1，但每天 -4 健康。" },
    influenceCash: { name: "影响力兑现", short: "1影响→120",  desc: "每天一次：1 影响力换 120 现金。" },
    ruleHack:      { name: "规则篡改",   short: "骰子+1",      desc: "所有骰子结果 +1（最高 6）。" },
    debtShift:     { name: "债务转移",   short: "债→记忆",     desc: "每天一次：50% 债务转成记忆损失（每 800 债务 ≈ 5 记忆）。" },
    badge:         { name: "逆熵者徽章", short: "隐藏",        desc: "集齐 7 枚碎片时浮现。它不会告诉你它能做什么。" }
  },

  /* ---------------- 规则页 ---------------- */
  rules: [
    { h: "目标", p: [
      "你有 30 天。活到第 30 天，结算时不欠任何人。",
      "但“活下来的方式”不止一种，它们通向不同的结局——结局的触发条件不会告诉你。",
      "自动存档：每次行动、每天结算、每次对话之后。中途关掉再打开，从“继续”接着玩。"
    ]},
    { h: "一天怎么过", p: [
      "每天开始时，交易所会自动做三件事：收熵税、收债务利息、让身上的规则碎片啃食记忆。",
      "然后你获得行动点（AP）：基础 3 点。健康低于 50 时 -1，低于 25 时再 -1。",
      "花完 AP，点「结束这一天」，进入下一天。"
    ]},
    { h: "熵税", p: [
      "熵税 = 100 + 15 × 当前天数 + 持有现金 × 4%。",
      "付不出来时，交易所按缺口取走你的健康与记忆。第 30 天，账就清了。"
    ]},
    { h: "三条命", p: [
      "健康：归零即死。打工、黑市、熵税都会消耗它；休息可以补回来。",
      "记忆：归零即遗忘，本局结束。它同时是你的抵押品，也是规则的载体。",
      "熵值：到 10 点当场熵灭。带熵的行动全账户最多用 9 次——除非你买熵减锚。"
    ]},
    { h: "规则碎片", p: [
      "碎片是被从世界里抽出来的“规则”。持有它，规则就随你移动。",
      "代价：第 3 枚碎片起，每枚每天啃掉 1 点记忆。碎片太多，你会先忘记自己。",
      "记忆低于 30 时，有可能忘掉一枚碎片。"
    ]},
    { h: "结算口径", p: [
      "净资产 = 现金 + 影响力×100 + 逆熵点×300 + 记忆×80 + 情报×50 − 债务。",
      "健康不计入净资产——它是你的命，不是你的钱。"
    ]}
  ],

  /* ---------------- 剧情节点（按顺序触发，条件不公开） ---------------- */
  scenes: [
    {
      id: "contract",
      day: 1,
      title: "第一日 · 契约",
      lines: [
        "第 1 天。你走进交易所。玻璃门在身后合上，外面那座城市正在忘记自己是什么——路灯忘了该怎么亮，桥忘了通向哪里，有人站在路口，忘了自己要去哪。",
        "柜台后坐着一个人。你看不清她的脸：不是光线的问题，是那张脸在你记忆里没有位置。",
        "她把一份契约推过来。纸很薄，边缘有细密的纤维，像从什么东西身上剥下来的皮肤。",
        "【逆熵协议 · 编号未定】期限：三十日。抵押：记忆 / 健康 / 信用 / 时间。违约：由交易所自行取走等值部分。",
        "「签这里。」她的指甲敲了敲最后一栏，「名字可以晚点再补。」"
      ],
      choices: [
        { text: "立刻签字", tone: "info",
          effect: { memory: -5, flags: { fastSign: true } },
          reply: "笔尖落下的瞬间，你听见很轻的一声——不是纸的声音，是某个人在你脑子里把一扇门关上了。" },
        { text: "逐条读完条款", tone: "info",
          effect: { intel: 1, memory: -2, flags: { readTerms: true } },
          reply: "第七条写着：交易所保留对“等值部分”的解释权。你把它读了三遍，记住了这七个字。" },
        { text: "先问她叫什么", tone: "info",
          effect: { influence: 3, flags: { askedName: true } },
          reply: "她停了半秒。「R-07。」她说，「这是工号。名字……早就抵押出去了。」" }
      ]
    },
    {
      id: "friend",
      day: 4,
      title: "第四日 · 旧友",
      lines: [
        "有人在交易所门口等你。陈默。你记得他是你的合伙人，也可能只是你在某份档案里读到的名字。",
        "他瘦得很快，像被什么东西从里面抽走了一半。「借我一千。」他说，「我签的是三个月的协议，还剩十九天。我不想到了最后一天，连自己欠谁都不记得。」",
        "他左手无名指上有一道旧疤。你没有立刻想起来那道疤是怎么来的。"
      ],
      choices: [
        { text: "借他 1000", tone: "good",
          require: function (S) { return S.cash >= 1000; }, reqText: "现金不足 1000",
          effect: { cash: -1000, credit: 8, flags: { lentFriend: true } },
          reply: "他把钱折成很小的一块塞进内袋，像藏起一颗糖。「三十天后我来还你。」他说。你们都知道他可能活不到那一天。" },
        { text: "拒绝", tone: "bad",
          effect: { credit: -5, memory: -3, flags: { refusedFriend: true } },
          reply: "他点点头，没有争。走远之后你才想起来：那道疤，是很多年前他替你挡下的。" },
        { text: "把条款里的漏洞告诉他", tone: "info",
          effect: { influence: 5, memory: -5, flags: { toldTruth: true } },
          reply: "你告诉他：交易所收的不是“等值”，是“你愿意承认是等值的那部分”。他盯着你看了很久，说：「你比我记得的多。」" }
      ]
    },
    {
      id: "broker",
      day: 7,
      title: "第七日 · 掮客",
      lines: [
        "一个穿灰西装的男人在你对面坐下，没等你同意。",
        "「记忆掮客。」他说，「我收你不要的那部分。二十点记忆，两千现金。手续费嘛——」他笑了一下，「一点熵。」",
        "你注意到他左手无名指上有一道旧疤，和陈默的一模一样。",
        "「别这么看我。」他说，「疤是发放的，配货。这座城市里每个‘熟人’，都是交易所配给你的。」"
      ],
      choices: [
        { text: "卖给他 20 点记忆", tone: "bad",
          require: function (S) { return S.memory > 20; }, reqText: "记忆不足",
          effect: { memory: -20, cash: 2000, entropy: 1, flags: { soldMemory: true } },
          reply: "他把手按在你额头上，像在称量什么。离开的是关于一个下雨天的一切——你不记得那天有没有伞了。" },
        { text: "拒绝", tone: "info",
          effect: { credit: 2, flags: { refusedBroker: true } },
          reply: "「有骨气。」他站起来，「不过骨气在我们这儿不收。」" },
        { text: "反问他：这些记忆会去哪", tone: "info",
          effect: { intel: 1, memory: -2, flags: { knowsBroker: true } },
          reply: "「去哪？」他想了想，「去补别人的空缺。你卖掉的母亲，可能会成为别人记忆里的一位母亲。这行当很讲良心。」" }
      ]
    },
    {
      id: "archive",
      day: 11,
      title: "第十一日 · 档案室",
      lines: [
        "交易所不锁门。它没有门。",
        "你沿着一条走廊走到尽头，档案室有三面墙，全是柜子，每个柜子里一份三十天的协议，编号从 R-01 开始。",
        "你找到 R-07 那一格。空的，只剩一张纸条，字迹被反复描过：「别把名字留在这里。」",
        "最里面还有一排柜子，标签上写着两个字：已结清。"
      ],
      choices: [
        { text: "把已结清的档案全读一遍", tone: "info",
          effect: { intel: 3, memory: -8, flags: { archiveRead: true } },
          reply: "三千多份协议，最后都收在同一栏：无需署名。你读到最后一份时，手指在发抖——那上面的笔迹，和你的很像。" },
        { text: "只抄下 R-07 的记录", tone: "info",
          effect: { ep: 1, memory: -3, flags: { archiveCopied: true } },
          reply: "记录只有一行：第七次逆熵完成。徽章七枚，熵值归零。申请人拒绝离场，转为柜台职务。" },
        { text: "烧掉档案室", tone: "bad",
          effect: { entropy: 3, flags: { archiveBurned: true } },
          reply: "火没有烧起来。纸页在火里翻了个面，上面的字变成了你的名字——很多份，写满了整面墙。" }
      ]
    },
    {
      id: "clerk",
      day: 15,
      title: "第十五日 · 柜台员",
      lines: [
        "她把今天的熵税单推过来，手指在纸边停了一下。",
        "「你不该去档案室。」她说。",
        "「R-07 是上一个三十天。」她终于抬头，「七枚碎片，一枚徽章，熵值归零。我拿到了最好的结局。然后我选择留下来，做柜台员。」",
        "「逆熵的人不能离开。」她说，「世界需要一个还记得它本来样子的人。可我记得的越来越少了。」"
      ],
      choices: [
        { text: "帮她离开（用你的记忆垫付）", tone: "good",
          require: function (S) { return S.memory >= 15; }, reqText: "至少需要 15 记忆",
          effect: { memory: -15, influence: 10, flags: { helpClerk: true } },
          reply: "你把十五点记忆按在柜台上。她的工号牌裂了一道缝。「走。」你说。她看了你很久，像在确认这句话是不是真的。" },
        { text: "向交易所告发她", tone: "bad",
          effect: { cash: 3000, credit: 5, flags: { betrayClerk: true } },
          reply: "广播响了一声，很短。第二天柜台后换了一个人，编号 R-08。他没有脸。" },
        { text: "什么都不说", tone: "info",
          effect: { memory: 5, flags: { silence: true } },
          reply: "她把单子收回去，动作很慢。「谢谢你没有记住这句话。」" }
      ]
    },
    {
      id: "auction2",
      day: 19,
      title: "第十九日 · 名字",
      lines: [
        "今天的拍卖台上放着一个玻璃匣，里面是一张纸片。纸片上写着你的名字。",
        "「本次拍卖品：契约者姓名，一号。」主持人说，「起拍价五千。」",
        "台下有人举牌。号码牌上是 R-07。",
        "你忽然明白她为什么一直看不清脸——她把自己的名字抵押出去的时候，是这个价。"
      ],
      choices: [
        { text: "拍下自己的名字", tone: "info",
          require: function (S) { return S.cash >= 5000; }, reqText: "现金不足 5000",
          effect: { cash: -5000, memory: 5, flags: { boughtName: true } },
          reply: "纸片落进你手里，很轻。你念了一遍上面的字，那个音节在嘴里很陌生，但它确实是你。" },
        { text: "拍下她的名字", tone: "good",
          require: function (S) { return S.cash >= 5000; }, reqText: "现金不足 5000",
          effect: { cash: -5000, flags: { savedName: true, helpClerk: true } },
          reply: "你把价抬到最高。R-07 的号码牌慢慢放下。「你不需要这个。」她说。你说：「你需要。」" },
        { text: "不参与", tone: "bad",
          effect: { entropy: 1, flags: { noAuction: true } },
          reply: "槌声落下。主持人宣布：流拍。你的名字回到了匣子里，等下一次开拍。" }
      ]
    },
    {
      id: "tide",
      day: 22,
      title: "第二十二日 · 熵潮",
      lines: [
        "第 22 天，城市大面积失序。红绿灯忘了自己的颜色，地铁在环线里无限循环，街上有人反复走同一段路——他们忘了自己要去哪。",
        "交易所的广播响了一整天：「请抵押更多，以维持秩序。」",
        "你站在门口。有人在你身边停下，问：「你记得这条路通向哪里吗？」"
      ],
      choices: [
        { text: "上街救人", tone: "good",
          effect: { health: -15, influence: 15, flags: { savedPeople: true } },
          reply: "你带回来了十一个人。他们记不住你的名字，但记得你拉过他们的手。" },
        { text: "趁机抄底", tone: "bad",
          effect: { cash: 4000, entropy: 1, flags: { profited: true } },
          reply: "秩序崩坏的时候，价格是最好谈的。你赚了四千，代价是又多欠了一点熵。" },
        { text: "躲进档案室", tone: "info",
          effect: { memory: -5, ep: 2, flags: { hid: true } },
          reply: "档案室的纸页在响。你在 R-07 的柜子前坐到天亮，等到街上重新安静。" }
      ]
    },
    {
      id: "sellname",
      day: 24,
      title: "第二十四日 · 第二次开拍",
      lines: [
        "第 24 天，交易所临时加开一场拍卖。台上还是那个玻璃匣，还是那张纸片。",
        "「契约者姓名，一号，第二次开拍。」主持人说，「本次起拍价：六万。」",
        "六万。你算了一下：这足够付清剩下所有的熵税，还够买下这个城市里任何一条还没断掉的街。",
        "R-07 站在台下，没有举牌。她只是看着你，很慢地摇了一下头。"
      ],
      choices: [
        { text: "卖掉名字", tone: "bad",
          effect: { cash: 60000, memory: -15, entropy: 1, flags: { soldName: true } },
          reply: "槌声落下。你在成交确认单上按了手印，手印是空的——没有名字的人，按出来的手印也是空的。" },
        { text: "抵押名字，换一万现金", tone: "info",
          effect: { cash: 10000, credit: -10, flags: { pawnName: true } },
          reply: "「抵押不是卖。」主持人强调，「到期不赎，连本带利一起算。」你签了字，字迹比平时淡。" },
        { text: "不卖", tone: "good",
          effect: { memory: 5, influence: 5, flags: { keptName: true } },
          reply: "你说：「这个不卖。」台下有人笑了，但 R-07 没有笑。她转过去，把今天的税单叠得整整齐齐。" }
      ]
    },
    {
      id: "core",
      day: 26,
      title: "第二十六日 · 核心",
      lines: [
        "走廊尽头不是档案室，是一间更小的房间。没有灯，只有一张桌子。桌上摊着你的契约，最后一栏还是空的。",
        "桌子后面有人说话。不是柜台员——是交易所自己。它的声音像很多份合同叠在一起翻页。",
        "「补上名字，你可以留下。」它说，「撕掉它，你可以走。」",
        "它停顿了一下。「只是走的那个人，不会是你。」"
      ],
      choices: [
        { text: "补上名字，留下来", tone: "bad",
          effect: { flags: { tookSeat: true }, influence: 20, entropy: -2 },
          reply: "你写下名字。笔迹在纸上蔓延开，像一条终于找到河床的水流。从今以后，你负责收租。" },
        { text: "撕掉契约", tone: "good",
          effect: { flags: { brokeContract: true }, entropy: 3, health: -10 },
          reply: "纸裂开的声音很响。整座交易所安静了一秒，然后开始遗忘你——就像它遗忘其他所有违约的人。" },
        { text: "谈条件：放她走，我留下", tone: "info",
          require: function (S) { return S.memory >= 25; }, reqText: "至少需要 25 记忆",
          effect: { flags: { bargainClerk: true, helpClerk: true }, memory: -25 },
          reply: "「有意思。」它说，「你拿自己的记忆，买别人的自由。」你听见柜台那边，有人轻轻吸了一口气。" }
      ]
    },
    {
      id: "final",
      day: 29,
      title: "第二十九日 · 最后一夜",
      lines: [
        "柜台员把最后一张熵税单收进抽屉。「明天这个时间，账就清了。」",
        "她第一次认真地看你。「你还记得自己叫什么吗？」",
        "你想了很久。你记得她左手无名指上有一道疤，记得陈默瘦得有多快，记得玻璃匣里那张纸片的重量。",
        "但名字本身，像一处被反复擦拭的空白。"
      ],
      choices: [
        { text: "把剩下的记忆都给她", tone: "good",
          require: function (S) { return S.memory >= 20; }, reqText: "至少需要 20 记忆",
          effect: { memory: -20, flags: { gaveMemory: true, helpClerk: true }, influence: 10 },
          reply: "你把记忆一片片揭下来递过去。最后一片上面是她的脸——这一次，看清了。" },
        { text: "用健康换一个空白的明天", tone: "info",
          effect: { health: -25, flags: { gaveHealth: true }, ep: 1 },
          reply: "你把寿命折成纸片递给柜台。她说：「你会记得痛，但不会记得为什么痛。」你说：「够了。」" },
        { text: "什么都不交，等结算", tone: "info",
          effect: { flags: { gaveNothing: true } },
          reply: "你把手插回口袋，听着交易所的钟一格一格走。三十天里你第一次什么都不欠，也什么都不指望。" }
      ]
    }
  ],

  /* ---------------- 结局（按顺序判定，条件不公开） ---------------- */
  endings: [
    {
      id: "entropy", title: "熵灭", tone: "bad",
      when: function (S) { return S.entropy >= 10; },
      text: [
        "熵值满了。不是爆炸，是安静——你身上的每一条规则同时停止生效，像一整栋楼同时关灯。",
        "最后的意识里，你想起来自己本来要说什么。你张开嘴，说出的是一段条款。",
        "交易所把你的名字收进档案，编号继续往下排。"
      ]
    },
    {
      id: "death", title: "死亡", tone: "bad",
      when: function (S) { return S.health <= 0; },
      text: [
        "你倒在柜台前。R-07 站起来，动作很轻，像怕吵醒什么。",
        "「第三十天的税，」她说，「可以不交了。」",
        "交易所收走了你的身体，把它挂在门口，作为一份价格标签。"
      ]
    },
    {
      id: "forgotten", title: "遗忘者", tone: "bad",
      when: function (S) { return S.memory <= 0; },
      text: [
        "记忆归零的那一刻，你还在走廊里走。你知道自己在走，但不知道要去哪。",
        "R-07 在门口叫了你的名字。你回头看她，很有礼貌地问：「您是谁？」",
        "交易所没有收走你。它只是不再需要你了。"
      ]
    },
    {
      id: "nameless", title: "无名者", tone: "bad",
      when: function (S) { return S.flags.soldName; },
      text: [
        "六万现金打进你账上的时候，拍卖台上一片安静。主持人念了成交价，然后念了一个编号——没有名字的编号。",
        "此后所有文件上那一栏都空着。别人叫你喂、哎、那个谁，你都答应，答应得很自然。",
        "交易所很喜欢这样的客户：一个没有名字的人，永远无法结清。第三十天，账本翻到最后一页，上面是一笔继续滚动的利息。"
      ]
    },
    {
      id: "twin", title: "双生", tone: "good",
      when: function (S) { return S.flags.helpClerk && S.flags.boughtName && S.entropy === 0; },
      text: [
        "结算日的钟敲了三十下。你把自己的名字还给自己，把她的名字还给她。",
        "交易所第一次没有收到任何抵押——它不习惯这个，像一台突然停摆的机器。",
        "你们走出玻璃门。外面还是那座健忘的城市，但这一次，至少有两个人记得彼此叫什么。"
      ]
    },
    {
      id: "named", title: "归名者", tone: "good",
      when: function (S) { return S.flags.boughtName; },
      text: [
        "你把那张纸片折好，放进内袋，贴着心脏。",
        "三十天结束，你从交易所走出来，嘴里念着自己的名字，一遍又一遍，像在数一件终于归位的家具。",
        "城市还在忘事。但你不再是其中之一。"
      ]
    },
    {
      id: "broken", title: "契约终结", tone: "good",
      when: function (S) { return S.flags.brokeContract; },
      text: [
        "你把撕成两半的契约扔在桌上。交易所安静了很久，久到你以为它已经死了。",
        "然后整座建筑开始退场：柜台、档案、玻璃匣，一层层褪成透明。城市里的路灯一盏盏想起自己是灯。",
        "你走出门，看见 R-07 站在台阶下等你。她终于有了脸。"
      ]
    },
    {
      id: "master", title: "交易所主人", tone: "bad",
      when: function (S) { return S.flags.tookSeat || (S.influence >= 100 && S.cash >= 50000); },
      text: [
        "你补上了名字，坐进那张椅子。桌面上摊着下一位契约者的协议，最后一栏空着。",
        "你听见自己用很多人的声音说话：「签这里。名字可以晚点再补。」",
        "门外有人推门进来。你抬起头，努力分辨他的脸——但你记得的事情已经太多了，多到装不下具体的某一张。"
      ]
    },
    {
      id: "antientropy", title: "逆熵者", tone: "good",
      when: function (S) { return S.fragments.indexOf("badge") >= 0 && S.entropy === 0; },
      text: [
        "七枚碎片在你胸口拼成一枚徽章。它没有图案，只有一圈很细的刻痕——像一个人反复写下又擦掉的名字。",
        "熵值归零。交易所对你失去了兴趣，就像一本没有欠款的账本。",
        "你走出玻璃门。这座城市忘了很多事，但你记得全部——包括那些不该被记住的部分。"
      ]
    },
    {
      id: "recorder", title: "记录者", tone: "info",
      when: function (S) { return S.flags.archiveRead && S.memory >= 50; },
      text: [
        "你带着三千多份协议的摘要离开交易所。它们在你脑子里排成一列，像一栋楼的窗户。",
        "第三十天以后，你成了唯一还知道规则原样的人。有人来找你，问路灯以前是什么颜色。",
        "你把答案写下来。写得很慢，因为每写一个字，你就少记得一点别的。"
      ]
    },
    {
      id: "free", title: "自由人", tone: "good",
      when: function (S) { return S.net >= 45000 && S.health >= 50 && S.memory >= 50; },
      text: [
        "结算日的账本合上时，你既不欠债，也不欠自己。",
        "你带走了能带走的一切：钱、人情、还有足够多的记忆。柜台员向你点头，那是三十天里她唯一一次像是在道别。",
        "自由是这么一种东西——它不允许你回头确认自己是不是真的走了出来。"
      ]
    },
    {
      id: "survivor", title: "普通幸存者", tone: "info",
      when: function (S) { return S.net > 0; },
      text: [
        "三十天到了。交易所把你的契约归档，在“已结清”那一栏盖了个章。",
        "你走出玻璃门，手里握着剩下的东西。不算多，但够你活一阵。",
        "你回头看了一眼——柜台后的人在整理单据，没有抬头。你也没记住她的工号。"
      ]
    },
    {
      id: "bankrupt", title: "破产者", tone: "bad",
      when: function () { return true; },
      text: [
        "结算日，账本上的数字是负的。交易所很有耐心，它说这不叫违约，叫延期。",
        "于是你被留下，用下一份三十天的协议还这一份的账。编号重新排队，从 R-01 开始。",
        "很久以后，有个新人推门进来，问你：「这里能借多少？」你听见自己说：「签这里。」"
      ]
    }
  ],

  changelog: [
    { v: "1.1.2", date: "2026-11-17", notes: [
      "新增单文件网页版：一个 HTML 就能发给别人玩（双击/浏览器打开）",
      "存档不可用时会明确提示，不再静默丢进度"
    ]},
    { v: "1.1.1", date: "2026-11-17", notes: [
      "修复：'规则被抹除'事件可能把逆熵者徽章一起抹掉，导致隐藏结局永远无法触发",
      "修复：记忆崩塌遗忘碎片时同样会丢掉徽章",
      "现在只要手上还有 7 枚碎片，徽章会自动回来"
    ]},
    { v: "1.1.0", date: "2026-11-17", notes: [
      "重做界面：标题页 / 协议条款 / 主界面 / 剧情弹窗 / 结局页，适配手机竖屏",
      "加入背景故事与 10 个关键节点，每个节点 3 个分支选择",
      "加入 13 种隐藏结局，条件不公开，由选择与数据共同决定",
      "修正健康溢出、拍卖吞资源、熵减锚只扣打工收入等旧问题",
      "碎片从第 3 枚起每天侵蚀记忆——遗忘机制现在真的会咬人",
      "熵税改为按现金百分比递增，钱越多税越重",
      "新增自动存档、继续游戏、重开一局"
    ]}
  ]
};
