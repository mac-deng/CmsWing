'use strict';

import Base from './base.js';
import API from 'wechat-api';

export default class extends Base{
    
    init(http){
        this.api = new API('wxe8c1b5ac7db990b6', 'ebcd685e93715b3470444cf6b7e763e6');
        //this.api = new API('wxec8fffd0880eefbe', 'a084f19ebb6cc5dddd2988106e739a07');
        super.init(http);
    }
    
    /**
     * 新建素材默认首页
     */
    fodderAction(){
        this.assign({"navxs": true,"bg": "bg-dark"});
        return this.display();
    }
    
    /**
     * 给微信上传临时素材 /图片 更新本地库
     */
    async wxuploadtmpAction(){
        //上传图片
        // this.end("暂不开发");
        let thumb_id = this.get('thumb_id');
        let model = this.model('picture');
        let data = await model.where({id:thumb_id}).find();
 
        let wx = function(api, data){
            let deferred = think.defer();
            api.uploadMaterial(think.ROOT_PATH+'/www/'+data.path, 'thumb', (err,result)=>{
                if(!think.isEmpty(result)){
                    deferred.resolve(result);
                }else{
                    console.error(err);
                }
            });
            return deferred.promise;
        } 
        
        let img_result = await wx(this.api, data);
        if(img_result){
            await model.where({id:thumb_id}).update({url: img_result, source_id: img_result.media_id});
            img_result.hs_image_src = data.path;
            this.end(img_result);
        }else{
            this.end("");
        }
    }
    
    /**
     * 上传保存永久素材
     */
    async savefodderAction(){
        let self = this;
        let params = self.post("params");
        let edit_id = self.get("edit_id");
        if(edit_id){
            self.success({"name":"编辑暂未开通", url:""});
        }
        try{
            var anews = JSON.parse(params);
        
            let wx = function(api, data) {
                let deferred = think.defer();
                api.uploadNewsMaterial(data, (err, result)=>{
                if(err){
                    deferred.reject(err);
                }else{
                    deferred.resolve(result);
                }
                });
                return deferred.promise;
            }
            let wxres = await wx(self.api, anews);
            let model = self.model('wx_material');
            if(wxres){
                let wxg = function(api, data) {
                    let deferred = think.defer();
                    api.getMaterial(data, (err, result)=>{
                        if(err){
                            deferred.reject(err);
                        }else{
                            deferred.resolve(result);
                        }
                    });
                    return deferred.promise;
                }
                let wx_news = await wxg(self.api, wxres.media_id);
                // let wx_news_str = JSON.stringify(wx_news);
                let time = new Date().getTime();
                let data = {
                    "media_id": wxres.media_id,
                    "material_content": params,
                    "material_wx_content": wx_news+'',
                    "web_token": 0,
                    "add_time": time
                }
                let effect = await model.add(data);
                if(effect){
                    self.success({"name":"上传成功！", url:""});
                }
            }
            self.error({"name":"上传失败！", url:""});
        }catch(e){
            self.error({"name":"上传失败！", url:""});
        }
    }
    
    /**
     * 素材列表
     */
    async fodderlistAction(){
        let self = this;
        self.meta_title = "微信素材列表";
        self.assign({"navxs": true, "bg": "bg-dark"});
        let model = self.model("wx_material");
        let data = await model.page(this.get('page')).countSelect();
        let Pages = think.adapter("pages","page");
        let pages = new Pages();
        let page = pages.pages(data);
        self.assign('pagerData', page);
        self.assign('fodder_list', data.data);
        return this.display();
    }
    
    async asyncfodderlistAction(){
        let self = this;
        let model = self.model("wx_material");
        let data = await model.page(this.get('page')).countSelect();
        self.end(data);
    }
    
    /**
     * 编辑
     */  
    async foddereditAction(){
        let id = this.get('id');
        //this.end(id)
        let model = this.model("wx_material");
        let data = await model.where({'id': id}).find();
        this.assign('data', JSON.stringify(data));
        //this.end(data);
        return this.display('fodder');
    }
    
    
    //-----------------------------------
    //自动回复
    async autoreplyAction(){
        let rule = await this.model('wx_keywords_rule').where({}).select();
        for(let i = 0; i < rule.length; i++){
            let current = rule[i];
            let ks = await this.model('wx_keywords').where({id: ['IN', current.keywords_id]}).select();
            let rs = await this.model('wx_replylist').where({id: ['IN', current.reply_id]}).select();
            rule[i].ks = ks;
            rule[i].rs = rs;
        }
        this.assign('rulelist', rule);
        return this.display();
    }
    /**
     * 新建规则
     */
    async createkruleAction(){
        //let id = 1;
        let rule_name = this.get('rule_name');
        let model = this.model('wx_keywords_rule');
        let id = await model.add({'rule_name': rule_name, 'create_time': new Date().getTime()});
        if(id){
            return this.success({name:"规则添加成功", ruleid: id});
        }else{
            return this.fail('添加规则失败');
        }
    }
    
    
    
    /**
     * 新建回复
     */  
    async createrAction(){
        let self = this;
        let type = self.post('type');
        let ruleid = self.post('ruleid');
        if(!ruleid){
            return self.fail('规则不存在');
        }
        let model = self.model('wx_replylist');
        let currtime = new Date().getTime();
        let currwebtoken = 0;
        let result = 0;
        await model.startTrans();
        switch (type) {
            case 'text':
                let content = self.post('content')
                result = await model.add({
                    'type': 'text',
                    'content': content,
                    'create_time': currtime,
                    'web_token': currwebtoken
                });
                break;
            case 'image':
            break;
            case 'audio':
            break;
            case 'video':
            break;
            case 'news':
            break;
        }
        
        if(result){
            let rulemodel = self.model('wx_keywords_rule');
            let ruledata = await rulemodel.where({id: ruleid}).find();
            console.log(ruledata);
            let rs = ruledata.reply_id.split(',');
            rs.push(result);
            let r = await rulemodel.where({id:ruleid}).update({'reply_id': rs.join(','), 'create_time': currtime });
            if(r){
                await model.commit();
                return self.success({name:'添加回复成功', rid:result });
            }else{
                await model.rollback();
                return self.fail('回复添加失败');
            }
        }else{
            await model.rollback();
            return self.fail('回复添加失败');
        }
    }
    /**
     * 删除回复
     */
    async deleterAction(){
        let self = this;
        let ruleid = self.post('ruleid');
        let rid = self.post('rid');
        let currtime = new Date().getTime();
        if(ruleid && rid){
            let model = self.model('wx_replylist');
            await model.startTrans();
            let rr = await model.where({id:rid}).delete();
            if(rr){
                let rulemodel = self.model('wx_keywords_rule');
                let ruledata = await rulemodel.where({id: ruleid}).find();
                let tmp = [];
                let rs = ruledata.reply_id.split(',');
                for(let i in rs){
                    if(rs[i] != rid){
                        tmp.push(rs[i]);
                    }
                }
                let r = await rulemodel.where({id: ruleid}).update({'reply_id': tmp.join(','), 'create_time': currtime });
                if(r){
                    await model.commit();
                    return self.success({name:'回复删除成功'});
                }else{
                    await model.rollback();
                    return self.fail('回复删除失败');
                }
            }else{
                await model.rollback();
                return self.fail('删除失败');
            }
        }else{
            return self.fail('提交参数错误');
        }
    }
    
    /**
     * 规则编辑 
     */
    async ruleeditAction(){
        let self = this;
        let ruleid = self.post('ruleid');
        let rulemodel = self.model('wx_keywords_rule');
        let ruledata = await rulemodel.where({id:ruleid}).find();
        let currtime = new Date().getTime();
        let currwebtoken = 0;
        let edittype = self.post('edittype'); //判断是编辑关键字 1，还是回复内容 2
        if(edittype == 1 && ruleid){
            //关键字操作
            let kmodel = self.model('wx_keywords');
            let kid = self.post('kid'); //如果带有kid表示该操作为删除，否则为添加
            if(kid){
                let r = await kmodel.where({id:kid}).delete();
                if(r){
                    let tmp = [];
                    let ks = ruledata.keywords_id.split(',');
                    for(let v in ks){
                        if(ks[v] != kid){
                            tmp.push(ks[v]);
                        }
                    }
                    await rulemodel.where({id:ruleid}).update({'keywords_id': tmp.join(','), 'create_time': currtime });
                }
                return self.json(r);
            }else{ 
                //新建关键字
                let kname = self.post('name');
                let ktype = self.post('type');
                let r = 0;
                try{
                    r = await kmodel.add({
                        'keyword_name': kname,
                        'match_type': ktype,
                        'rule_id': ruleid,
                        'create_time': currtime,
                        'web_token': currwebtoken
                    });
                }catch(e){
                    return self.json(-1);
                }
                if(r){
                    let ks = ruledata.keywords_id.split(',');
                    ks.push(r);
                    await rulemodel.where({id:ruleid}).update({'keywords_id': ks.join(','), 'create_time': currtime });
                }
                return self.json(r);
            }
        }else if(edittype == 2 && ruleid){
            //回复操作
        }else{}
    }
    
    /**
     * 删除规则
     */  
    async ruledeleteAction(){
        let self = this;
        let ruleid = self.post('ruleid');
        let rulemodel = self.model('wx_keywords_rule');
        await rulemodel.startTrans();
        let currentrule = await rulemodel.where({id: ruleid}).find();
        let kids = currentrule.keywords_id;
        let rids = currentrule.reply_id;
        let kmodel = self.model('wx_keywords');
        let rmodel = self.model('wx_replylist');
        let kres = await kmodel.where({id: ['IN', kids]}).delete();
        let rres = await rmodel.where({id: ['IN', rids]}).delete();
        let rulres = await rulemodel.where({id: ruleid}).delete();
        if(rulres){
            await rulemodel.commit();
            return self.success({name:'规则删除成功'});
        }else{
            await rulemodel.rollback();
            return self.fail('规则删除失败');
        }
    }
    
    /**
     * 关注自动回复
     */
    async followAction(){
        let self = this;
        this.assign({"navxs": true,"bg": "bg-dark"});
        return self.display();
    }
    /**
     * 消息自动回复
     */
    async messageAction(){
        let self = this;
        this.assign({"navxs": true,"bg": "bg-dark"});
        return self.display();
    }


}